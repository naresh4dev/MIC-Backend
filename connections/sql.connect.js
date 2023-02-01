// require('dotenv').config();

// const mssql = require('mssql');

// const config = {
//     user : process.env.SQL_USER,
//     database : process.env.SQL_DB_NAME,
//     password : process.env.SQL_SERVER_PASSWORD,
//     server :  process.env.SQL_DB_HOST,
//     options : {
//         encrypt : true,
//         trustServerCertificate : true
//     }
// }



// module.exports = async ()=>{
//     try {
//         const connection = mssql.connect(config,(res)=>{
//             console.log(res);
//         });
//         connection.catch(err=>{
//             console.log(err);
//         });
//         return connection;
//     } catch (err) {
//         console.error(err);
//         return 0;
//     }
// };
