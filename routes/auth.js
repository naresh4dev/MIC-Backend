const router = require('express').Router();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { query } = require('express');
const sql = require('mssql');
const passport = require('passport');

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
            
            res.setHeader('set-cookie','dnsdj')
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

router.post('/register',(req,res)=>{
    const user = {
        fname : req.body.fname,
        lname : req.body.lname,
        username : req.body.username,
        email : req.body.email,
        phone : req.body.phone,         
    }
    console.log(req.body);
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
            request.query(`insert into users(fname,lname,username,user_email,password,phone) OUTPUT Inserted.user_id values(@fname,@lname,@username,@email,@password,@phone); `,(queryErr,result)=>{
                if(queryErr){
                    console.error(queryErr);
                    res.json({res:false});
                } else {
                    request.input('id',sql.NVarChar,result.recordset[0].user_id);
                    request.query('insert into CartTable(user_id) values(@id);insert into WishlistTable(user_id) values(@id);',(queryErr,result)=>{
                        if(!queryErr) {
                            res.json({res:true});
                        } else {
                            res.json({res:false});
                            console.log(queryErr);
                        }
                    });
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

module.exports = router;