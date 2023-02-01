require('dotenv').config();
const express = require('express');
const my_connection  = require("./connections/sql.connect"); 
const auth_router = require('./routes/auth');
const product_router = require('./routes/product');
const sql = require('mssql');
const bodyParser = require('body-parser');
const corsOrgin = require('cors')
const app = express();
const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(corsOrgin(corsOptions))
app.use(bodyParser.urlencoded(true));
app.use('/api/auth',auth_router);
app.use('/api/products',product_router);

const config = {
    user : process.env.SQL_USER,
    database : process.env.SQL_DB_NAME,
    password : process.env.SQL_SERVER_PASSWORD,
    server :  process.env.SQL_DB_HOST,
    options : {
        encrypt : true,
        trustServerCertificate : true
    }
}
const appPool = new sql.ConnectionPool(config)

appPool.connect().then(pool =>{
    app.locals.db = pool;
    console.log('Successfully SQL SERVER Connected');

}).catch(err=>{
    console.error("Error in connecting to SQL SERVER");
    console.log(err);
});


app.post('/post',(req,res)=>{
    console.log(req.body.msg);
    res.json({res:true});
});

app.listen(3001,(err)=>{
    if(!err)
        console.log("Server Initiated at port 3000");
    else 
        console.log(err);
});