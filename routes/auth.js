const router = require('express').Router();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { query, request } = require('express');
const sql = require('mssql');
const passport = require('passport');
const axios = require('axios');
const SendSMS = require('../connections/send-sms');
const IsNumber = require('../utility/checkForNumber');

router.use(bodyParser.urlencoded({extended:false}));

router.post('/signin', passport.authenticate('login'),(req,res)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    const request = req.app.locals.db.request();
    
    request.input('user_id',sql.NVarChar,req.user.id);
    request.query(`select user_id, username, fname,lname,user_email from users where user_id=@user_id`,(queryErr,result)=>{
        if(!queryErr) {
            
            res.json({res:true, user:{id : req.user.id,fname : result.recordset[0].fname,lname : result.recordset[0].lname ,type : req.user.type, username : result.recordset[0].username,email : result.recordset[0].user_email }});
        } else {
            console.log(queryErr);
            res.json({res:false});
        }
    });
});


router.post('/prime', passport.authenticate('prime-login'),(req,res)=>{
    res.header('Access-Control-Allow-Credentials', 'true');
    const request = req.app.locals.db.request();
    request.input('user_id',sql.NVarChar, req.user.id);
    request.query('select user_id, user_name, user_email, user_status, user_type from PrimeUsers where user_id=@user_id',(queryErr,result)=>{
        if(!queryErr) {
            
            
            res.json({res:true, user : {id : result.recordset[0].user_id,user_type :result.recordset[0].user_type, user_name : result.recordset[0].user_name ,type : req.user.type}});
        } else {
            res.json({res:false});
        }
    });
});

router.post('/',(req,res)=>{
    if(req.isAuthenticated()){
        res.header('Access-Control-Allow-Credentials', 'true');
        const request = req.app.locals.db.request();
        request.input('user_id',sql.NVarChar, req.user.id);
        if(req.user.type =='prime') {
            request.query('select user_id, user_name, user_email, user_status, user_type from PrimeUsers where user_id=@user_id',(queryErr,result)=>{
                if(!queryErr) {
                    res.json({res:true, user : {id : result.recordset[0].user_id,user_type :result.recordset[0].user_type, user_name : result.recordset[0].user_name ,type : req.user.type}});
                } else {
                    res.json({res:false});
                }
            });
        } else {
            request.query('select user_id, user_name, user_email, user_status, user_type from Users where user_id=@user_id',(queryErr,result)=>{
                if(!queryErr) {
                    res.json({res:true, user : {id : result.recordset[0].user_id,user_type :result.recordset[0].user_type, user_name : result.recordset[0].user_name, type:req.user.type}})
                } else {
                    res.json({res:false});
                }
            });
        }
        
    } else {
        res.json({res:false});
    }
})

router.post('/login',(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('email',sql.VarChar,req.body.email);
    request.input('password',sql.NVarChar,req.body.password);
    request.query(`select * from users where user_email = @email`,(queryErr,result)=>{
        if(queryErr){
            console.error(queryErr);
            res.json({res:false});
        } else {
            console.log(result);
            console.log(req.body);
            if (result.recordset.length === 0) {
                res.json({res:true,auth : false});
            } else {
                res.json({res:true, auth : true, user : result.recordset[0]});
            }
            
        }
    });
});



router.post('/register', (req,res)=>{
    const user = {
        fname : req.body.fname,
        lname : req.body.lname,
        username : req.body.username,
        email : req.body.email,
        phone : req.body.mobile,         
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


router.get('/address',(req,res,next)=>{
    if(req.isAuthenticated())
    next()
    else {
        res.json({res:false, error_msg : "Auth Required"});
    }
},(req,res)=>{
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


router.post("/address/:mode",(req,res,next)=>{
    if(req.isAuthenticated())
    next()
    else {
        res.json({res:false, error_msg : "Auth Required"});
    }
},(req,res)=>{
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

module.exports = router;