const router = require('express').Router();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { query } = require('express');
const sql = require('mssql');

router.use(bodyParser.urlencoded(true));
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
                    console.log(result);
                    res.json({res:true,user : result.recordsets[0]});
                } 
            });
        }
    });

});

module.exports = router;