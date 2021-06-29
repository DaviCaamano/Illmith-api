const parse = require('../utils/parse');
const db = require('../utils/database');

const ADMIN_ROLE_ID = 0;

const validate = (req, res, next, admin) => {

    const token = req.header('auth') || req.body.token || req.query.token;

    if(!token || token === 'undefined') return res.status(400).send({success: false});
    const ip = parse.getIp(req);

    const params = admin? [ip, token, ADMIN_ROLE_ID]: [ip, token];
    let query = `
        SELECT a.user_id, u.username, u.email, u.role_id, r.name AS role, a.expiration
        FROM authentications a
        LEFT JOIN users u
        ON a.user_id = u.id
        LEFT JOIN roles r
        ON r.id = u.role_id
        WHERE a.ip = ?
        AND a.token = ?${admin? `
        AND u.role_id = ?;`: ';'}`

    db.query(query, params, true).then(userRec => {

        if(!userRec || Array.isArray(userRec) && userRec.length === 0){

            req.userValidated = false;
            if(admin) req.userAuthorized = false;
        }
        else {

            const userInfo = userRec[0];
            req.userValidated = true;
            if(admin) req.userAuthorized = true;
            req.user = {
                userId: userInfo.user_id,
                username: userInfo.username,
                email: userInfo.email,
                role_id: userInfo.role_id,
                role: userInfo.role,
                token: token,
                expiration: userInfo.expiration
            }
        }
        next();
    });
}

module.exports = {
    validate: (req, res, next) => validate(req, res, next),
    authorize: (req, res, next) => validate(req, res, next, true)
}