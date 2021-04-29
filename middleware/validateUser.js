const parse = require('../utils/parse');
const db = require('../utils/database');

validate = (req, res, next) => {

    const body = req.method === 'POST'? req.body: req.query;
    const ip = parse.getIp(req);

    let query = `
        SELECT user_id, username, email
        FROM authentications a
        LEFT JOIN users u
        ON a.user_id = u.id
        WHERE ip = "${ip}"
        AND token = "${body.token}"`;

    db.query(query, true).then(userRec => {

        console.log('userRec');
        console.log(userRec[0]);
        if(!userRec || Array.isArray(userRec) && userRec.length === 0){

            req.userValidated = false;
        }
        else {

            const userInfo = userRec[0];
            req.userValidated = true;
            req.user = {
                userId: userInfo.user_id,
                username: userInfo.username,
                email: userInfo.email
            }
        }
        next();
    });


}

module.exports = validate;