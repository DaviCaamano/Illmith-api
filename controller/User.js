const db = require('../utils/Database');
const parse = require('../utils/Parse');
const mail = require('../utils/Mail')
const bcrypt = require('bcrypt');
const moment = require('moment');

let { codes, getCode } = require('../data/codes');
const   MAX_USERNAME_LENGTH = 32,
        MAX_PASSWORD_LENGTH = 32,
        MAX_EMAIL_LENGTH = 255;


class User {

    login = async (req, res) => {

        const body = req.method === 'POST'? req.body: req.query;
        const ip = parse.getIp(req);

        const identifier = body.user? body.user.toLowerCase(): '';
        let query = `
            SELECT *
            FROM users
            WHERE email = "${identifier}"
            OR username = "${identifier}";
            SELECT *
            FROM pending_users
            WHERE email = "${identifier}"
            OR username = "${identifier}";`;

        db.query(query, true).then( async userRec => {

            const user = userRec[0][0];
            const pendingUser = userRec[1][0];

            if(!user || !user.email || !user.password){

                if(pendingUser){

                    return res.status(400).send(codes.Error.UserRegistration.emailNotValidated)
                }
                else return loginCredentialsError(req, res);
            }

            if (await bcrypt.compare(body.password, user.password)) {

                /** Correct Username/Password */
                delete user.password;
                parse.signJWT(JSON.parse(JSON.stringify(user))).then(jwt => {

                    const token = jwt.token
                    const tokenExpiration = moment(jwt.decoded.exp * 1000).format('YYYY-MM-DD hh:mm:ss')
                    const params = db.insertQueryParams({
                        user_id: user.id,
                        ip,
                        expiration: tokenExpiration,
                        token
                    });

                    let query = `
                    INSERT INTO authentications (${params.columns})
                    VALUES (${params.values});`;
                    db.query(query).then(() =>
                        res.send({
                            success: true,
                            ...user,
                            token,
                            userId: user.id,
                            tokenExpiration: jwt.decoded.exp
                        })
                    ).catch(() => {
                        genericLoginError(req, res)
                    })
                });

            } else {
                loginCredentialsError(req, res);
            }

        }).catch((err) => {

            genericLoginError(req, res)
        })
    }

    logout = (req, res) => {

        let body = req.method === 'POST'? req.body: req.query;
        const ip = parse.getIp(req);

        const query = `
        DELETE
        FROM authentications
        WHERE user_id = ${body.userId || 'NULL'}
        or token = ${body.token? '\"' + body.token + '\"': 'NULL' }
        or ip = ${ip? '\"' + ip + '\"': 'NULL' };`

        db.query(query).then((authRecs) => {

            res.send({ success: true })
        }).catch(() => genericLoginError(req, res))
    }

    finishRegistration = (req, res) => {

        const body = req.method === 'POST'? req.body: req.query;

        let query = `
        DELETE FROM pending_users
        WHERE expiration < NOW();
        SELECT * FROM pending_users
        WHERE token = "${body.token}";`;
        db.query(query, true).then( async (pendingUserRecs) => {

            //Link no longer valid or was never valid
            if(pendingUserRecs[1].length === 0)
                return res.status(400).send({
                    success: false,
                    ...codes.Error.UserRegistration.userRegistraitionLinkInvalid
                })

            const userInfo = pendingUserRecs[1][0];
            if(userInfo.email){

                const decoded = await parse.jwtVerify(body.token);
                const password = await parse.encryptPassword(decoded.password)
                const params = {
                    password: password,
                    email: userInfo.email,
                }
                if(userInfo.username) params.username = userInfo.username;
                const queryParams = db.insertQueryParams(params)

                query = `
                    DELETE FROM pending_users
                    WHERE email = "${userInfo.email}";
                    INSERT INTO users (${queryParams.columns})
                    VALUES (${queryParams.values});`

                db.query(query, true).then(newUserRec => {


                    const responseData = {
                        email: userInfo.email,
                        username: userInfo.username,
                        userId: newUserRec[1].insertId,
                    };
                    const promises = [parse.signJWT(responseData)];

                    if(decoded.subscribe){
                        query = `
                        INSERT IGNORE INTO news_subscriptions (user_id)
                        VALUES (${newUserRec[1].insertId});`
                        promises.push(db.query(query, true))
                    }
                    Promise.all(promises).then(([jwt, subscriptionRec]) => {

                        res.send({
                            ...responseData,
                            token: jwt.token,
                            tokenExpiration: jwt.decoded.exp
                        });
                    })

                })
            }
        })
    }

    startRegistration = (req, res) =>{

        const body = req.method === 'POST'? req.body: req.query;

        if(body.email) body.email = body.email.toLowerCase();
        if(body.username) body.username = body.username.toLowerCase();

        let query = `
            SELECT id
            FROM users
            WHERE email = "${body.email}";
            SELECT id
            FROM users
            WHERE username = "${body.username}";`;

        db.query(query, true).then( async userRec => {

            /** ERRORS **/
            const validation = validateRegisteringUser(
                userRec[0].length > 0,
                userRec[1] && userRec[1].length > 0,
                body.email,
                body.username,
                body.password
            )

            if(!validation.success){

                return res.status(401).send(validation)
            }

            const userInfo = {
                email: body.email,
                password: body.password,
                expiration: moment().add(1, 'days').format('YYYY-MM-DD hh:mm:ss')
            }

            if(body.username) userInfo.username = body.username;
            if(body.subscribe) userInfo.subscribe = body.subscribe;

            parse.signJWT(userInfo).then(jwt => {

                mail.sendUserRegistrationValidationEmail(body.email, jwt.token).then((error, info) => {

                    if (error.rejected.length > 0) {

                        res.status(500).send(error)
                    } else {

                        const params = {
                            email: userInfo.email,
                            expiration: userInfo.expiration,
                            token: jwt.token
                        }
                        if(userInfo.username) params.username = userInfo.username;
                        const subscribeQueryParams = db.insertQueryParams(params);
                        const userQueryParams = db.insertQueryParams(params);
                        query = `
                            DELETE FROM pending_users
                            where email="${body.email}";
                            INSERT INTO pending_users (${userQueryParams.columns})
                            VALUES (${userQueryParams.values});`;

                        db.query(query, true).then(pendingUsersRec => {

                            res.send(params)
                        }).catch(err => {

                            genericLoginError(req, res)
                        })
                    }
                })
            })
        }).catch(err => {

            genericLoginError(req, res)
        })
    }


    startPasswordReset = (req, res) => {

        const body = req.method === 'POST'? req.body: req.query;

        let query = `
        SELECT * FROM pending_users
        WHERE email = "${body.user}"
        OR username = "${body.user}";`;
        db.query(query, true).then( async (existingUserRec) => {

            console.log(existingUserRec[0])

            //GET THE EMAIL OF THIS USE.
            const email = null;


        })
    }

    finishPasswordReset = (req, res) =>{

        const body = req.method === 'POST'? req.body: req.query;

        if(body.email) body.email = body.email.toLowerCase();
        if(body.username) body.username = body.username.toLowerCase();

        let query = `
            SELECT id
            FROM users
            WHERE email = "${body.email}";
            SELECT id
            FROM users
            WHERE username = "${body.username}";`;

        db.query(query, true).then( async userRec => {

            /** ERRORS **/
            const validation = validateRegisteringUser(
                userRec[0].length > 0,
                userRec[1] && userRec[1].length > 0,
                body.email,
                body.username,
                body.password
            )

            if(!validation.success){

                return res.status(401).send(validation)
            }

            const userInfo = {
                email: body.email,
                password: body.password,
                expiration: moment().add(1, 'days').format('YYYY-MM-DD hh:mm:ss')
            }

            if(body.username) userInfo.username = body.username;
            if(body.subscribe) userInfo.subscribe = body.subscribe;

            parse.signJWT(userInfo).then(jwt => {

                mail.sendUserRegistrationEmail(body.email, jwt.token).then((error, info) => {

                    if (error.rejected.length > 0) {

                        res.status(500).send(error)
                    } else {

                        const params = {
                            email: userInfo.email,
                            expiration: userInfo.expiration,
                            token: jwt.token
                        }
                        if(userInfo.username) params.username = userInfo.username;
                        const subscribeQueryParams = db.insertQueryParams(params);
                        const userQueryParams = db.insertQueryParams(params);
                        query = `
                            DELETE FROM pending_users
                            where email="${body.email}";
                            INSERT INTO pending_users (${userQueryParams.columns})
                            VALUES (${userQueryParams.values});`;

                        db.query(query, true).then(pendingUsersRec => {

                            res.send(params)
                        }).catch(err => {

                            genericLoginError(req, res)
                        })
                    }
                })
            })
        }).catch(err => {

            genericLoginError(req, res)
        })
    }



}

const genericLoginError = (req, res) => {

    const error = getCode('NA_LOGIN')
    res.status(500).send({
        error: error.message,
        code: error.code
    })
}

const loginCredentialsError = (req, res) => {

    const error = getCode('ILI_LOGIN')
    /** Wrong Password */
    res.status(400).send({ error: error.message, code: error.code })
}

const validateUserRegistrationPassword = (password) => {

    const hasEnoughLetters = (new RegExp("(?=.{6,})")).test(password);
    const hasNumber = (new RegExp("(?=.*[0-9])")).test(password);
    const hasLowercase = (new RegExp("(?=.*[a-z])")).test(password);
    const hasUppercase = (new RegExp("(?=.*[A-Z])")).test(password);

    return hasEnoughLetters && hasNumber && hasLowercase && hasUppercase;
}

const validateUserRegistrationEmail = (email) =>
    /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/.test( email );

const validateUserRegistrationUsername = (username) => {

    if(!username) return true;
    return new RegExp('^[a-zA-Z0-9_.-]*$').test(username);
}

const validateRegisteringUser = (emailAlreadyUsed, usernameAlreadyUsed, email, username, password) => {

    //Email Already in Use
    if(emailAlreadyUsed){

        return {
            success: false,
            ...codes.Error.UserRegistration.emailInUse
        };
    }
    //Username Aleady in use
    if(usernameAlreadyUsed){

        return {
            success: false,
            ...codes.Error.UserRegistration.usernameInUse
        };
    }
    //Invalid Email
    if(!validateUserRegistrationEmail(email)){

        return {
            success: false,
            ...codes.Error.UserRegistration.invalidEmail
        };
    }
    //Invalid Username
    if(!validateUserRegistrationUsername(username)){

        return {
            success: false,
            ...codes.Error.UserRegistration.invalidUsername
        };
    }
    //Email too long.
    if(email.length > MAX_EMAIL_LENGTH){

        return {
            success: false,
            ...codes.Error.UserRegistration.emailTooLong
        }
    }
    //Username too long
    if(username && username.length > MAX_USERNAME_LENGTH){

        return {
            success: false,
            ...codes.Error.UserRegistration.usernameTooLong
        }
    }
    //Username too long
    if(password.length > MAX_PASSWORD_LENGTH){

        return {
            success: false,
            ...codes.Error.UserRegistration.usernameTooLong
        }
    }
    //Invalid Password
    if(!validateUserRegistrationPassword(password)){

        return {
            success: false,
            ...codes.Error.UserRegistration.invalidPassword
        };
    }
    return { success: true }
}
module.exports = new User();