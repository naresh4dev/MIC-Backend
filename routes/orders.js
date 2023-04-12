require('dotenv').config();
const razorInstance = require('../connections/razorpay-connect');
const router = require('express').Router();
const bodyParser = require('body-parser');
const sql = require('mssql');

router.use(bodyParser.urlencoded(true));

router.post('/createorder',(req,res)=>{
    razorInstance.orders.create({
        amount : parseInt(((req.body.total_amount)*100)),
        currency : 'INR'
    },(err,data)=>{
        if (err) {
            console.log(err);
            res.json({res:false});
        } else {
            res.json({res:true,data:data,key : process.env.RAZORPAY_KEY_ID});
        }
    });
});

router.get('/all',(req,res,next)=>{
    if(req.isAuthenticated())
        next()
},(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('user_id', sql.NVarChar, req.user.id);
    request.query('select order_id, total_amount, payment_status,payment_mode, order_status from Orders where user_id=@user_id',(queryErr,result)=>{
        if(!queryErr) {
            res.json({res:true, orders : result.recordset});
        } else {
            res.json({res:false});
        }
    });
});

router.post('/payment/:status',(req,res)=>{
    console.log(req.body);
    if(req.params.status === "success") {
        const request = req.app.locals.db.request();
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear().toString().slice(-2);
        request.input('payment_id', sql.NVarChar, req.body.razorpayPaymentId);
        request.input('user_id', sql.NVarChar, req.user.id);
        request.input('month',sql.Char,currentMonth);
        request.input('year',sql.Char,currentYear);
        request.input('total_amount',sql.Decimal,req.body.total_amount);
        request.input('pay_mode',sql.VarChar, 'razorpay');
        request.input('pay_status',sql.VarChar,'success');
        request.query('Insert into Orders(ordered_month, ordered_year,user_id,total_amount,payment_status,payment_mode,order_status,payment_id) values(@month,@year,@user_id,@total_amount,@pay_status,@pay_mode,@order_status,@payment_id)',(queryErr,result)=>{
            if(!queryErr) {

                res.json({res:true, order:true});
            } else {
                console.log(queryErr)
                res.json({res:true, order:false});
            }
        });
    } else {
        res.json({res:true, order:false});
    }
});

module.exports = router;
