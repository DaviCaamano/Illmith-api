const mysql = require('mysql2');
const log = (...args) => console.log(...args);

const LOG_ENABLED = true;
let conn;
try{
    conn = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
        connectionLimit: 100
    });
} catch(e) {
    log('DATEBASE INIT ERROR');
    log(e);
}

class Database {

    conn = conn;
    connection = conn;
    query = (query, params, connection, rawFlag = false) => {

        const connector = typeof connection === 'boolean' || typeof connection === 'undefined'? conn: connection;
        const raw = params === true || connection === true || !!rawFlag;

        console.log('raw', raw)
        return new Promise(async (resolve, reject) => {

            let sql = connector.format(query, Array.isArray(params)? params: undefined);
            if (LOG_ENABLED) {

                log('db.query');
                log(sql);
            }
            connector.query(sql, (err, resp) => {

                if (err) {

                    log('MYSQL Error:')
                    log(sql)
                    log(err)
                    reject({
                        success: false,
                        description: 'Internal Server Error',
                        status: 500,
                        error: err
                    });
                } else resolve(raw? resp: {success: true, data: resp});
            });
        })
    }

    insert = (table, params, updateDuplicates, rawFlag) => {
        try{

            //if last argument is a boolean, set raw as true
            const raw = params === true || updateDuplicates === true || !!rawFlag
            const [query, parsedParams] = writeInsertQuery(table, params, false, updateDuplicates);

            return this.query(query, parsedParams, raw)

        } catch(e){

            e.location = "Error in database.insert().";
            log(e);
        }

    }

    insertIgnore = (table, params, updateDuplicates, rawFlag) => {

        try{
            //if last argument is a boolean, set raw as true
            const raw = (params === true || updateDuplicates === true || !!rawFlag)
            console.log('Coming from ignore:', raw)
            const [query, parsedParams] = writeInsertQuery(table, params, true, updateDuplicates);
            return this.query(query, parsedParams, raw)

        } catch(e){

            e.location = "Error in database.insertIgnore().";
            log(e);
        }

    }

    writeInsert = (table, params, updateDuplicates) => {
        return writeInsertQuery(table, params, false, updateDuplicates);
    }

    writeIgnoreInsert = (table, params, updateDuplicates) => {
        return writeInsertQuery(table, params, true, updateDuplicates);
    }

    getEnvVars = () => {
        try{

            return new Promise((resolve, reject) => {

                if(!this.envVarsSet){

                    this.query('SELECT * FROM env', true).then(envVars => {

                        for(let data of envVars)
                            process.env[data.name] = data.value

                        process.env.FRONTEND_URL = process.env.NODE_ENV === 'prod'
                            ? process.env.SITE_URL
                            : process.env.LOCAL_HOST

                        this.envVarsSet = true;
                        resolve();
                    }).catch(reject);
                }
            });
        } catch(e){

            e.location = "Error in database.getEnvVars().";
            log(e);
        }
    }

}

writeInsertQuery = (table, params, ignore, duplicateUpdate) => {

    try {
        if(!params) return;
        if(typeof params !== 'object' || Array.isArray(params))
            throw new Error('Insert Query Params function only accepts JSON.');

        let newParams = [];
        for(let field in params)
            newParams.push(params[field]);

        const   columns = Object.keys(params).join(', '),
            values = newParams.map(item => '?').join(', ');

        let onDuplicateUpdateString;
        if(duplicateUpdate) {

            [onDuplicateUpdateString, duplicateParams] = createDuplicateKeyPairs(params);
            newParams.push.apply(newParams, duplicateParams);
        }

        return [
            `INSERT${ignore? ' IGNORE ': ' '}INTO ${table} (${columns})
            VALUES (${values})${onDuplicateUpdateString? `
            ON DUPLICATE KEY UPDATE ${onDuplicateUpdateString};`: ';'}`,
            newParams
        ]
    } catch(e){

        e.location = "Error in database.writeInsertQuery().";
        log(e);
    }
}


const createDuplicateKeyPairs = (args) => {
    try{

        const params = [];
        let argumentString = '',
            j = 0;

        for(let i in args){

            //Exclude Keys.
            argumentString += (j++ === 0)
                ? `
        ${i} = ?`
                : `,
        ${i} = ?`
            params.push(args[i]);

        }
        return [argumentString, params];
    } catch(e){

        e.location = "Error in database.createDuplicateKeyPairs().";
        log(e);
    }

}


const parseObjectForQuery = (obj, level = 0) => {

    try{

        let stringified = level === 0? '"': '';
        stringified += Array.isArray(obj)? '[': '{';

        let iter = 0;
        for(let prop in obj) {

            if (iter++ > 0) stringified += ', ';
            if (typeof obj[prop] === 'object' && obj[prop] !== null)

                if (!Array.isArray(obj))
                    stringified += '\\"' + prop + '\\":' + parseObjectForQuery(obj[prop], level + 1);
                else
                    stringified += parseObjectForQuery(obj[prop], level + 1);

            //Property value is a string and needs quotations
            else if (typeof obj[prop] === 'string') {

                if (!Array.isArray(obj))
                    stringified += '\\"' + prop.replace(/"/g, '\\"') + '\\":\\"'
                        + obj[prop].replace(/"/g, '\\"') + '\\"';
                else
                    stringified += '\\"' + obj[prop].replace(/"/g, '\\"') + '\\"';
            }
            else if (typeof obj[prop] === 'undefined')

                stringified += '\\"' + prop + '\\":\\"' + null + '\\"';

            //Property value is not a string or object, and does not need quotations.
            else
            if (!Array.isArray(obj))
                stringified +=  '\\"' + prop + '\\":' + obj[prop];
            else
                stringified +=  obj[prop] ;
        }

        stringified += Array.isArray(obj)? ']': '}';
        stringified += level === 0? '"': '';
        return stringified ;
    } catch(e){

        e.location = "Error in database.getEnvVars().";
        log(e);
    }
}

module.exports = new Database();
