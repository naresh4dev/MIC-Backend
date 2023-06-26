require('dotenv').config();
const express = require('express');
const auth_router = require('./routes/auth');
const product_router = require('./routes/product');
const order_router = require('./routes/orders');
const mlm_router = require('./routes/mlm');
const admin_router = require('./routes/admin');
const wallet_router = require('./routes/wallet');
const image_router = require('./routes/image');
const sql = require('mssql');
const bodyParser = require('body-parser');
const corsOrgin = require('cors')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const busboy = require('connect-busboy');
const {SendOTP, SendWalletTransacMSG} = require('./connections/send-sms');

const IsNumber = require('./utility/checkForNumber');
const CalculatePointsToWalletTransfer = require('./utility/scheduledMLMActions');

const app = express();
const corsOptions = {
    origin: ['https://admin.otpindia.in', 'https://otpindia.in', 'https://master.otpindia.in','http://localhost:8080','http://localhost:3000'],
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200
}
app.use(busboy({
    immediate : false
}));
app.use(corsOrgin(corsOptions))
app.use((req,res,next)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    next()
})
app.use(bodyParser.urlencoded({extended : false}));
app.use(session({
    secret :process.env.SESSION_SECRET,
    cookie : {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly : false,
        secure : true,
    },
    saveUninitialized: false,
}));
app.use(cookieParser())
app.use(passport.initialize());
app.use(passport.session());
function addUserToRequest(req, res, next) {
    if (req.isAuthenticated()) {
      req.user = req.session.passport.user;
      
    }
    next();
}
app.use(addUserToRequest);
app.use('/api/auth',auth_router);
app.use('/api/products/',product_router);
app.use('/api/orders/',order_router);
app.use('/api/tree/',mlm_router);
app.use('/api/admin/',admin_router);
app.use('/api/wallet',wallet_router);
app.use('/api/image',image_router);

passport.serializeUser(function(user, done) {
    done(null, user);
});


passport.deserializeUser(function(user, done) {
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
        request.input('user_id',sql.VarChar,user.id);
        const query = `select user_id from ${user.type=='prime'?'PrimeUsers':'users'} where user_id=@user_id`;
        request.query(query,(queryErr,result)=>{
            if(queryErr) {
                return done(queryErr,false);
                console.log(queryErr)
            } else {
               return  done(null, {id : result.recordset[0].user_id,type : 'user'});
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
                    else return cb(null, {id : result.recordset[0].user_id, type: 'user'});
                });
            }
        }
    });
}));

passport.use('prime-login',new LocalStrategy({passReqToCallback:true,usernameField: 'email',
passwordField: 'password'},function (req ,username,password,cb){
    const request = req.app.locals.db.request();
    request.input('user_id',sql.VarChar,username);
    request.query(`select user_id,user_password from PrimeUsers where user_id = @user_id`,(queryErr,result)=>{
        if(queryErr){
            console.error(queryErr);
           return cb(null, false)
        } else {
            if (result.recordset.length === 0) {
               
               return cb(null, false, {message : "Invalid Credentials"})
            } else {
                bcrypt.compare(password,result.recordset[0].user_password,(compareErr,compareRes)=>{
                    if(compareErr) return cb(compareErr,false)
                    else if(!compareRes) return cb(null,false)
                    else return cb(null, {id : result.recordset[0].user_id , type : "prime"});
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
        trustServerCertificate : true,
        requestTimeout: 9000000,
    },
    pool : {
        max : 30,
        min : 1,
        idleTimeoutMillis : 600000,
    },
    
}
const appPool = new sql.ConnectionPool(config)

appPool.connect().then(pool =>{
    app.locals.db = pool;
    console.log('Successfully SQL SERVER Connected');
}).catch(err=>{
    console.error("Error in connecting to SQL SERVER");
    console.log(err);

});



app.post('/api/sendotp', async (req,res)=>{ 
    try {
        if (req.query?.type != 'wallet') {
            const number = parseInt(req.body.number);
            if (!IsNumber(number)) {
                return res.json({res : false, error_msg : "Invalid Mobile Number"});
            }
            const result =  await SendOTP({Number : req.body.number});
            if (result.success) {
                return res.json({res:true, success : true, sms_id : result.msg_id});
            } else {
                return res.json({res:true, success : false, error_msg : "Unable to process Msg Request" });
            }
        } else if (req.query.type =='wallet' && req.isAuthenticated()) {
            const request = req.app.locals.db.request();
            request.input('id',sql.NVarChar, req.user.id);
            const getNumber = await request.query('select user_mobile_number from PrimeUsers where user_id=@id');
            const number = getNumber.recordset[0].user_mobile_number;
            if (!IsNumber(number)) {
                return res.json({res : false, error_msg : "Invalid Mobile Number"});
            }
            const result = await SendWalletTransacMSG({Number : number, transacAmount : req.body.amount});
            if (result.success) {
                return res.json({res:true, success : true, sms_id : result.msg_id});
            } else {
                return res.json({res:true, success : false, error_msg : "Unable to process Msg Request" });
            }
        } else {
            res.json({res:false, error_msg : 'UnAuthorized'})
        }
    } catch (err) {
        console.log(err)
        res.json({res : false, error_msg : "Internal Server Error"});
    }
});



app.listen(process.env.PORT,(err)=>{
    if(!err)
        console.log(`Server Initiated at port ${process.env.PORT}`);
    else 
        console.log(err);
});



