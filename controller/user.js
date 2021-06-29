const bcrypt = require('bcrypt');
const moment = require('moment');
const db = require('../utils/database');
const parse = require('../utils/parse');
const mail = require('../utils/mail')

const log = (...args) => console.log(...args);
let { codes } = require('../utils/codes');
const   MAX_USERNAME_LENGTH = 32,
        MAX_PASSWORD_LENGTH = 32,
        MAX_EMAIL_LENGTH = 255;

const ADMIN_ID = 0;

class User {

    validate = (req, res) => {

        try{

            if(req.userValidated){

                const user = req.user;
                const response = {
                    token: user.token,
                    expiration: user.expiration,
                };
                if(user.role_id === ADMIN_ID) response.admin = true;
                res.send(response)
            }
            else {
                return res.status(400).send({ success: false })
            }
        } catch(e){

            e.location = "Error in users.validate().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    authorize = (req, res) => {

        try{

            if(req.userAuthorized)
                res.send({
                    success: true,
                    token: req.user.token,
                    expiration: req.user.expiration,
                });
            else
                return res.status(400).send({ success: false })
        } catch(e){

            e.location = "Error in users.authorize().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    login = async (req, res) => {

        try{

            const body = req.body;


            const identifier = body.user? body.user.toLowerCase(): '';

            let query = `
            SELECT id, email, username, password, role_id 
            FROM users
            WHERE email = ?
            OR username = ?
            LIMIT 1;
            SELECT email
            FROM pending_users
            WHERE email = ?
            OR username = ?
            LIMIT 1;`;

            db.query(query, [identifier, identifier, identifier, identifier], true)
            .then(async ([[user], [pendingUser]]) => {

                if(pendingUser) return res.status(400).send(codes.Error.UserRegistration.emailNotValidated)

                if(!user || !user.email || !user.password){

                    return loginCredentialsError(req, res);
                }

                if (await bcrypt.compare(body.password, user.password)) {
                    loginResponse(
                        parse.getIp(req),
                        user.id,
                        user.email,
                        user.username,
                        body.remember,
                        user.role_id === ADMIN_ID
                    )
                    .then((response) => res.send(response))
                        .catch(() => genericLoginError(req, res));

                } else { loginCredentialsError(req, res); }
            })
            .catch(() => { genericLoginError(req, res) })
        } catch(e){

            e.location = "Error in users.login().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    authorizedLogin = async (req, res) => {

        try{

            const body = req.body;

            const identifier = body.user? body.user.toLowerCase(): '';
            let query = `
                SELECT id, email, username, password, role_id
                FROM users
                WHERE role_id = ?
                AND (email = ?
                OR username = ?);`;

            db.query(query, [ADMIN_ID, identifier, identifier], true)
            .then( async userRec => {

                const user = userRec[0];

                if(!user || !user.email || !user.password)
                    return loginCredentialsError(req, res);

                //Check if password is valid
                if (await bcrypt.compare(body.password, user.password)) {

                    loginResponse(parse.getIp(req), user.id, user.email, user.username, body.remember, true)
                    .then((response) => res.send(response))
                    .catch(() => genericLoginError(req, res))

                } else { loginCredentialsError(req, res); }

            }).catch((err) => { genericLoginError(req, res) })
        } catch(e){

            e.location = "Error in users.authorizedLogin().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    logout = (req, res) => {

        try{

            const ip = parse.getIp(req);
            db.query(`DELETE FROM authentications WHERE ip = ?;`, [ip])
            .then(() => res.send({ success: true }))
            .catch(() => genericLoginError(req, res))
        } catch(e){

            e.location = "Error in users.logout().";
            log(e);
            res.status(500).send({ success: false })
        }

    }

    startRegistration = (req, res) =>{

        try{

            const body = req.query;
            if(body.email) body.email = body.email.toLowerCase();
            if(body.username) body.username = body.username.toLowerCase();

            let query = `
            SELECT id
            FROM users
            WHERE email = ?;
            SELECT id
            FROM users
            WHERE username = ?;`;

            db.query(query, [body.email, body.username], true).then( async userRec => {

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
                            const [insertQuery, insertParams] = db.writeInsert('pending_users', params);
                            query = `
                            DELETE FROM pending_users
                            where email= ?;
                            ${insertQuery}`;

                            db.query(query, [body.email].concat(insertParams))
                                .then(() => res.send(params))
                                .catch(() => genericLoginError(req, res))
                        }
                    })
                })
            }).catch(err => {

                genericLoginError(req, res)
            })
        } catch(e){

            e.location = "Error in users.startRegistration().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    finishRegistration = (req, res) => {

        try{

            const body = req.body;

            let query = `
                DELETE FROM pending_users
                WHERE expiration < NOW();
                SELECT * FROM pending_users
                WHERE token = ?;`;
            db.query(query, [body.token], true)
            .then( async (pendingUserRecs) => {

                //Link no longer valid or was never valid
                if(pendingUserRecs[1].length === 0)
                    return res.status(400).send({
                        success: false,
                        ...codes.Error.UserRegistration.userRegistraitionLinkInvalid
                    })

                const userInfo = pendingUserRecs[1][0];
                if(userInfo.email){

                    const decoded = await parse.jwtVerify(body.token);
                    const password = await parse.hashPassword(decoded.password)
                    const params = {
                        password: password,
                        email: userInfo.email,
                    }
                    if(userInfo.username) params.username = userInfo.username;

                    const [insertQuery, insertParams] = db.writeInsert('users', params)
                    query = `
                DELETE FROM pending_users
                WHERE email = ?;
                ${insertQuery}`;
                    db.query(query, [userInfo.email].concat[insertParams]).then(newUserRec => {


                        const responseData = {
                            email: userInfo.email,
                            username: userInfo.username,
                            userId: newUserRec[1].insertId,
                        };
                        const promises = [parse.signJWT(responseData)];

                        if(decoded.subscribe){
                            query = `
                    INSERT IGNORE INTO news_subscriptions (user_id)
                    VALUES (?);`
                            promises.push(db.query(query, [newUserRec[1].insertId], true))
                        }
                        Promise.all(promises).then(([jwt]) => {

                            res.send({
                                ...responseData,
                                token: jwt.token,
                                tokenExpiration: jwt.decoded.exp
                            });
                        })

                    })
                }
            })
            .catch(() => genericFinishRegistrationError(req, res))
        } catch(e){

            e.location = "Error in users.finishRegistration().";
            log(e);
            res.status(500).send({ success: false })
        }

    }

    startPasswordReset = (req, res) => {
        try{

            const body = req.query;

            let query = `
        SELECT * 
        FROM users
        WHERE email = ?
        OR username = ?;`;
            db.query(query, [body.user, body.user], true)
                .then( async (userRec) => {

                    //No user has either an email or username matching the requested account.
                    if(!userRec || (Array.isArray(userRec) && !userRec.length))
                        return res.send({success: true});

                    const email = userRec[0].email;
                    const token = parse.randomizeString(127);
                    mail.sendResetPasswordEmail(email, token).then(() => {

                        db.insert(
                            'pending_password_resets',
                            {
                                user_id: userRec[0].id,
                                token,
                                expiration: moment().add(1, 'days').format('YYYY-MM-DD hh:mm:ss')
                            },
                            {
                                token,
                                expiration: moment().add(1, 'days').format('YYYY-MM-DD hh:mm:ss')
                            },
                            true
                        )
                            .then(() => res.send({ success: true }))
                            .catch(() => res.send({ success : true }))
                    }).catch(() => {

                        res.send({ success: true })
                    })

                })
        } catch(e){

            e.location = "Error in users.startPasswordReset().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    finishPasswordReset = (req, res) => {

        try{

            const body = req.body;

            let query = `
                DELETE FROM pending_password_reset
                WHERE expiration < NOW();
                SELECT * 
                FROM pending_password_reset p
                LEFT JOIN users u
                ON u.id = p.user_id
                WHERE token = ?;`;
            db.query(query, [body.token], true).then( async (pendingUserRecs) => {

                //Link no longer valid or was never valid
                if(pendingUserRecs[1].length === 0)
                    return res.status(400).send({
                        success: false,
                        ...codes.Error.ResetPassword.forgotPasswordLinkInvalid
                    })

                const userInfo = pendingUserRecs[1][0];
                if(userInfo.user_id){

                    const password = await parse.hashPassword(body.password)
                    query = `
                    DELETE FROM pending_users
                    WHERE email = ?;
                    UPDATE users 
                    SET password = "${password}"
                    WHERE id = ?`

                    db.query(query, [userInfo.email, userInfo.user_id],true)
                        .then(() => res.send({ success: true }))
                }
            })
        } catch(e){

            e.location = "Error in users.finishPasswordReset().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

}

const genericLoginError = (req, res) => {

    const error = codes.Error.Login.generic;
    res.status(500).send({
        error: error.message,
        code: error.code
    })
}

const genericFinishRegistrationError = (req, res) => {

    const error = codes.Error.UserRegistration.generic;
    res.status(500).send({
        error: error.message,
        code: error.code
    })
}

const loginCredentialsError = (req, res) => {

    const error = codes.Error.Login.invalidCredential;
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


const loginResponse = (ip, id, email, username, remember, admin) => {

    try{

        return new Promise((resolve, reject) => {

            const tokenInfo = { email, username };
            if(admin) tokenInfo.admin = true;

            parse.signJWT(JSON.parse(JSON.stringify(tokenInfo)), remember)
            .then(jwt => {

                const token = jwt.token
                const tokenExpiration = moment(jwt.decoded.exp * 1000).format('YYYY-MM-DD hh:mm:ss')
                const params = { user_id: id, token, ip, expiration: tokenExpiration }
                db.insert('authentications', params, true)
                .then(() => resolve({ success: true, token, tokenExpiration}))
                .catch(reject)
            });
        })
    } catch(e){

        e.location = "Error in users.loginResponse().";
        log(e);
    }
}
