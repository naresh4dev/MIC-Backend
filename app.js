require('dotenv').config();
const express = require('express');
const auth_router = require('./routes/auth');
const product_router = require('./routes/product');
const order_router = require('./routes/orders');
const mlm_router = require('./routes/mlm');
const sql = require('mssql');
const bodyParser = require('body-parser');
const corsOrgin = require('cors')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const app = express();
const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(corsOrgin(corsOptions))
app.use(bodyParser.urlencoded({extended : false}));
app.use(session({secret :process.env.SESSION_SECRET}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/auth',auth_router);
app.use('/api/products',product_router);
app.use('/api/orders',order_router);
app.use('/api/tree/',mlm_router);



passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(id, done) {
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
    sql.connect(config, (err)=>{
        if(err) {
            done(err,false);
            console.log(err)
        }
        const request = new sql.Request();
        request.query(`select user_id from users where user_id=${id}`,(queryErr,result)=>{
            if(queryErr) {
                done(queryErr,false);
                console.log(queryErr)
            } else {
                console.log("Done")
                done(null, result.recordset[0].user_id);
            }
            
            
        })
    })
    
  });


passport.use('login',new LocalStrategy({passReqToCallback:true,usernameField: 'email',
passwordField: 'password'},function (req ,username,password,cb){
    const request = req.app.locals.db.request();
    request.input('email',sql.VarChar,username);
    request.input('password',sql.NVarChar,password);
    request.query(`select user_id,password from users where user_email = @email`,(queryErr,result)=>{
        if(queryErr){
            console.log('here')
            console.error(queryErr);
           return cb(null, false)
        } else {
            if (result.recordset.length === 0) {
               
               return cb(null, false, {message : "Invalid Credentials"})
            } else {
                bcrypt.compare(password,result.recordset[0].password,(compareErr,compareRes)=>{
                    if(compareErr) return cb(compareErr,false)
                    else if(!compareRes) return cb(null,false)
                    else return cb(null, result.recordset[0].user_id);
                });
            }
        }
    });
}));

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

app.listen(process.env.PORT,(err)=>{
    if(!err)
        console.log(`Server Initiated at port ${process.env.PORT}`);
    else 
        console.log(err);
});



