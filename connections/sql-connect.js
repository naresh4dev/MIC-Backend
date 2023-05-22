require('dotenv');
const sql = require('mssql');

const config = {
    user : process.env.SQL_USER,
    database : process.env.SQL_DB_NAME,
    password : process.env.SQL_SERVER_PASSWORD,
    server :  process.env.SQL_DB_HOST,
    options : {
        encrypt : true,
        trustServerCertificate : true
    }, 
    pool : {
        max : 20,
        min : 0,
        idleTimeoutMillis: 30000
    }
}

const sqlConnect = ()=>{
    return new Promise((resolve,reject)=>{
        sql.connect(config, (err,connection)=>{
            if(err)
            reject(err);
            else
            resolve(connection);
            });
            });
}

module.exports = sqlConnect;