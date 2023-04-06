require('dotenv').config();
const express = require('express');
const auth_router = require('./routes/auth');
const product_router = require('./routes/product');
const order_router = require('./routes/orders');
const mlm_router = require('./routes/mlm');
const sql = require('mssql');
const bodyParser = require('body-parser');
const corsOrgin = require('cors')
const neo4j_driver = require('./connections/neo4j-connect');
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
app.use('/api/orders',order_router);
app.use('/api/tree/',mlm_router);
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

let session 
neo4j_driver().then((newdriver)=>{
    session = newdriver.session();
    session.run('CREATE (p:Person) ');
}).catch('ERROR');


app.post('/post',(req,res)=>{
    console.log(req.body.msg);
    res.json({res:true});
});

app.listen(process.env.PORT,(err)=>{
    if(!err)
        console.log(`Server Initiated at port ${process.env.PORT}`);
    else 
        console.log(err);
});



