const db = require('../utils/Database');


class test {

    deleteRegisterUserTest = (req, res) => {

        let query = `
        DELETE FROM pending_users
        WHERE email = "noreplysennoscampaign@gmail.com";
        DELETE FROM users
        WHERE email = "noreplysennoscampaign@gmail.com";`;
        db.query(query).then(() => {

            res.send('ok');
        }).catch(console.log)
    }
}

module.exports = new test();