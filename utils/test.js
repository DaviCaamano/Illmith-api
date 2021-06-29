const db = require('./database');

/**
 Base Route:
 /api/test/
 **/
class test {

    general = (req, res) => {

        let path = 'planar realities/mizof'
        console.log("path.split('/').slice(0, -1).join('/')")
        console.log(path.split('/').slice(0, -1).join('/'))
        return new Promise((resolve, reject) => {

            db.query(`
            SELECT COUNT(id) as count
            FROM articles
            WHERE path = ?;`,
                [path.split('/').slice(0, -1).join('/')],
                true
            ).then((parentRec) => {

                console.log('parentRec');
                console.log(parentRec[0]);
                console.log(parentRec[0].count > 0);
            }).catch(console.log)
        })
    }
}

module.exports = new test();