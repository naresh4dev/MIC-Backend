const router = require('express').Router();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { query, request } = require('express');
const sql = require('mssql');
const passport = require('passport');
const axios = require('axios');
const SendSMS = require('../connections/send-sms');
const IsNumber = require('../utility/checkForNumber');
const isLoggedIn = require('../utility/isLoggedIn');

router.use(bodyParser.urlencoded({extended:false}));

router.post('/signin', async (req,res,next)=>{
    if (req.body.email.slice(0,3) == 'APJ') {
        passport.authenticate('prime-login', (err, user, info) => {  
          if (err) {
            console.error(err);
            return res.status(401).json({ res: false });
          }
          if (!user) {
            return res.status(401).json({res:false});
          }
    
          req.login(user, (err) => {
            if (err) {
              console.error(err);
              return res.status(401).json({ res: false });
            } else {
                next();
            } 
             // Call next() to proceed to the next middleware/route handler
          });
        })(req, res, next);
      } else {
        passport.authenticate('login', (err, user, info) => {
          if (err) {
            console.error(err);
            return res.status(401).json({ res: false });
          }
          if (!user) {
            return res.status(401).json({ res: false });
          }
    
          req.login(user, (err) => {
            if (err) {
              console.error(err);
              return res.status(401).json({ res: false });
            } else {
                next();
            }
             // Call next() to proceed to the next middleware/route handler
          });
        })(req, res, next);
      }
},(req,res)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    const request = req.app.locals.db.request();
    res.cookie('connect.sid',req.sessionID,{
        signed:true,
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        httpOnly: false, // Whether the cookie can be accessed by client-side JavaScript
        secure: true, // Only send the cookie over HTTPS
        sameSite: 'none' // Allow the cookie to be sent in cross-site requests
      });
    request.input('user_id',sql.NVarChar,req.user.id);
    if (req.user.type == 'user') {
        request.query(`select user_id, username, fname,lname,user_email from users where user_id=@user_id`,(queryErr,result)=>{
            if(!queryErr) {
                
                res.json({res:true, user:{id : req.user.id,fname : result.recordset[0].fname,lname : result.recordset[0].lname ,type : req.user.type, username : result.recordset[0].username,email : result.recordset[0].user_email }});
            } else {
                console.log(queryErr);
                res.json({res:false});
            }
        });
    } else {
        request.query('select p.user_id, p.user_name, p.user_email, p.user_status, p.user_type,pw.wallet_amount, pw.discount_coupon from PrimeUsers as p join PrimeUsersWallet as pw on p.user_id=pw.prime_user_id where p.user_id=@user_id',(queryErr,result)=>{
            if(!queryErr) {
                
                res.json({res:true, user : {id : result.recordset[0].user_id,user_type :result.recordset[0].user_type, user_name : result.recordset[0].user_name ,type : req.user.type, wallet_amount : result.recordset[0].wallet_amount, discount_coupon : result.recordset[0].discount_coupon}});
            } else {
                console.log(queryErr);
                res.json({res:false});
            }
        });
    }

   
});


router.post('/login/admin',passport.authenticate('admin'), (req,res)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    res.cookie('connect.sid',req.sessionID,{
        signed:true,
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        httpOnly: false, // Whether the cookie can be accessed by client-side JavaScript
        secure: true, // Only send the cookie over HTTPS
        sameSite: 'none' // Allow the cookie to be sent in cross-site requests
      });
    res.json({res:true});
});


router.post('/login/master',passport.authenticate('master'), (req,res)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    res.json({res:true, user : req.user});
});


router.post('/logout',(req,res, next)=>{
    if (!req.isAuthenticated()) return res.status(403).json({res:false});
    else next()
}, (req,res)=>{
    req.logOut((err)=>{
        if(err){
            console.error(err);
            res.status(501).json({res:false, error_msg : "Internal Server error"})
        } else {
            res.json({res:true});
        }
    })
});

router.post('/',(req,res)=>{
    if(req.isAuthenticated()){
        res.header('Access-Control-Allow-Credentials', 'true');
        const request = req.app.locals.db.request();
        request.input('user_id',sql.NVarChar, req.user.id);
       
        if(req.user.type =='prime') {
            request.query('select p.user_id, p.user_name, p.user_email, p.user_status, p.user_type,pw.wallet_amount, pw.discount_coupon from PrimeUsers as p join PrimeUsersWallet as pw on p.user_id=pw.prime_user_id where p.user_id=@user_id',(queryErr,result)=>{
                if(!queryErr) {
                    
                    res.json({res:true, user : {id : result.recordset[0].user_id,user_type :result.recordset[0].user_type, user_name : result.recordset[0].user_name ,type : req.user.type, wallet_amount : result.recordset[0].wallet_amount, discount_coupon : result.recordset[0].discount_coupon}});
                } else {
                    res.json({res:false});
                }
            });
        } else {
            request.query('select user_id, username, user_email from users where user_id=@user_id',(queryErr,result)=>{
                if(!queryErr) {
                    res.json({res:true, user : {id : result.recordset[0].user_id, user_name : result.recordset[0].username, type:req.user.type}})
                } else {
                    console.log(queryErr);
                    res.json({res:false});
                }
            });
        }
        
    } else {
        res.json({res:false});
    }
})


router.post('/register', (req,res)=>{
    const user = {
        fname : req.body.fname,
        lname : req.body.lname,
        username : req.body.username,
        email : req.body.email,
        phone : req.body.phone,         
    }
    if (!IsNumber(user.phone))
        return res.json({res:false, error_msg : "Invalid mobile number" });
    bcrypt.hash(req.body.password, 10, (err,hash)=>{
        if(err){
            console.error(err);
            res.json({res:false});
        } else {
            user.password = hash;
            const request = req.app.locals.db.request();
            request.input('fname',sql.VarChar,user.fname);
            request.input('lname',sql.VarChar,user.lname);
            request.input('username',sql.VarChar,user.username);
            request.input('password',sql.NVarChar,user.password);
            request.input('email',sql.VarChar,user.email);
            request.input('phone', sql.Numeric,user.phone);
            request.input('sms_id',sql.NVarChar,req.body.sms_id);
            request.input('otp',sql.Int,parseInt(req.body.user_entered_otp));
            const checkOTPQuery = 'select 1 from OTPSMS where msg_id=@sms_id and otp=@otp';
            request.query(checkOTPQuery,(queryErr,result)=>{
                if(!queryErr) {
                    if (result.recordset.length === 0) {
                        res.json({res:false, error_msg : "Invalid OTP, try again"});
                    } else {
                        request.query(`insert into users(fname,lname,username,user_email,password,phone) OUTPUT Inserted.user_id values(@fname,@lname,@username,@email,@password,@phone); `,(queryErr2,result)=>{
                            if(queryErr){
                                console.error(queryErr);
                                res.json({res:false, error_msg : "Internal Server Error"});
                            } else {
                                request.input('id',sql.NVarChar,result.recordset[0].user_id);
                                request.query('insert into CartTable(user_id) values(@id);insert into WishlistTable(user_id) values(@id);',(queryErr,result)=>{
                                    if(!queryErr && result.rowsAffected[0]==1) {
                                        
                                        res.json({res:true});
                                    } else {
                                        res.json({res:false, error_msg : "Internal Server Error"});
                                        console.log(queryErr);
                                    }
                                });
                            } 
                        });
                    }
                } else {
                    console.error(queryErr);
                    res.json({res:false, error_msg : 'Internal Server Error'});
                }
            });
            
        }
    });

});

router.post('/enquiry',(req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('user_name', sql.NVarChar, req.body.user_name);
        request.input('email', sql.NVarChar, req.body.email);
        request.input("phone", sql.NVarChar, req.body.phone);
        request.query("insert into PrimeUsersEnquiry values(@user_name, @email,@phone)",(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true, action : true});
            } else {
                console.log(queryErr);
                res.json({res:true,action : false });
            }
        }); 
    } catch (err) {
        res.json({res:false});
        console.log(err);
    }
    
});

router.post('/support',(req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('user_name', sql.NVarChar, req.body.user_name);
        request.input('email', sql.NVarChar, req.body.email);
        request.input("subject", sql.NVarChar, req.body.subject);
        request.input('context', sql.NVarChar, req.body.context);
        request.query("insert into SupportTable values(@user_name, @email,@subject, @context)",(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true, action : true});
            } else {
                console.log(queryErr);
                res.json({res:true,action : false });
            }
        }); 
    } catch (err) {
        res.json({res:false});
        console.log(err);
    }
});


router.get('/address',isLoggedIn,(req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('user_id', sql.NVarChar, req.user.id);
        request.query("select * from AddressBook where addr_user_id=@user_id",(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true, address : result.recordset});
            } else {
                console.log("GET ADDRESS QUERY");
                console.log(queryErr);
                res.json({res:false});
            }
        });
    } catch(error) {
        res.json({res:false, error_msg : error});
        console.log("GET ADDRESS");
        console.error(error);
    }
})


router.post("/address/:mode",isLoggedIn,(req,res)=>{
    if (req.params.mode == 'new') {
        try {
            const request = req.app.locals.db.request();
            request.input('user_id', sql.NVarChar, req.user.id);
            request.input('name', sql.NVarChar, req.body.name);
            request.input('addr_f', sql.NVarChar, req.body.address_first_line);
            request.input('addr_s', sql.NVarChar, req.body.address_second_line);
            request.input('city', sql.NVarChar, req.body.city);
            request.input('state', sql.NVarChar, req.body.state);
            request.input('zip', sql.Char, req.body.zip);
            request.input('phone', sql.Char, req.body.phone);
            request.input('type',sql.Char,req.user.type=='prime'?'P':'N');
            const query = `INSERT INTO AddressBook values(@addr_f,@addr_s,@city,@zip,@state,@phone,@name,@user_id,@type);`
            request.query(query, (queryErr) => {
                if(queryErr) {
                    console.error(queryErr);
                    res.json({res:false, error_msg : "Internal Server Errro"});
                } else {
                    res.json({res:true,action : true});
                }
            });
        } catch (error) {
            console.log('ADDRESS NEW:')
            console.error(error);
            res.json({res:false, error_msg : "Internal Sever Error"});
        }
    } else if (req.params.mode == 'update') {
        try {
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, req.body.name);
            request.input('addr_f', sql.NVarChar, req.body.address_first_line);
            request.input('addr_s', sql.NVarChar, req.body.address_second_line);
            request.input('city', sql.NVarChar, req.body.city);
            request.input('state', sql.NVarChar, req.body.state);
            request.input('zip', sql.Char, req.body.zip);
            request.input('phone', sql.Char, req.body.phone);
            request.input('addr_id', sql.NVarChar, req.body.addr_id);
            const query = `UPDATE AddressBook SET addr_first_line=@addr_f, addr_second_line=@addr_s, addr_city=@city, addr_pincode=@zip, addr_state=@state, addr_phone=@phone, addr_name=@name where addr_id=@addr_id;`
            request.query(query, (queryErr) => {
                if(queryErr) {
                    console.error(queryErr);
                    res.json({res:false, error_msg : "Internal Server Error"});
                } else {
                    res.json({res:true,action : true});
                }
            });
        } catch (error) {
            console.log('ADDRESS UPDATE:');
            console.error(error);
            res.json({res:false, error_msg : "Internal Sever Error"});
        }
    } else if (req.params.mode == 'del') {
        try {
            const request = req.app.locals.db.request();
            request.input('id',sql.NVarChar,req.body.addr_id);
            const query = `DELETE FROM AddressBook where addr_id=@id;`
            request.query(query, (queryErr) => {
                if(queryErr) {
                    console.error(queryErr);
                    res.json({res:false, error_msg : queryErr});
                } else {
                        res.json({res:true,action : true});
                }
            });

        } catch (error) {
            console.log('ADDRESS DEL:');
            console.error(error);
            res.json({res:false, error_msg : "Internal Sever Error"});
        }
    } else {
        res.json({res:false, error_msg : "Invalid Parameters Request"});
    }
});

router.post('/resetpassword',async (req, res)=>{
    try {
        if (req.body.user_id == undefined || req.body.sms_id == undefined || req.body.user_entered_otp==undefined || req.body.password == undefined || req.body.password.length < 8 )
            throw new Error('Invalid Request Body');
        const verification = await SendSMS.VerifyOTP({otp : req.body.user_entered_otp, sms_id : req.body.sms_id});
        if(!verification.verify) 
            throw new Error("Invalid OTP");
        const response = await bcrypt.hash(req.body.password, 10, async (err, hash)=>{
            if(err)
                throw new Error("Unable to hash the password");
            const request = req.app.locals.db.request();
            request.input('user_id', sql.NVarChar, req.body.user_id);
            request.input('password', sql.NVarChar, hash);
            let updateQuery;
            if (req.body.user_id.slice(0,3)=='APJ')
                updateQuery = 'update PrimeUsers set user_password=@password where user_id=@user_id;';
            else 
                updateQuery = 'update users set password=@password where user_id=@user_id;';
            const result = await request.query(updateQuery);
            if (result.rowsAffected[0] != 1) {
                return {res:true, action : false,}
            } else {
                return {res:true, action : true}
            }
        });
        return res.json(response);

        

    } catch (err) {
        res.json({res:false, error_msg : err.message});
    }
    
});


module.exports = router;