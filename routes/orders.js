require('dotenv').config();
const razorInstance = require('../connections/razorpay-connect');
const router = require('express').Router();
const bodyParser = require('body-parser');
const sql = require('mssql');
const { SendOrderConfirmationMSG } = require('../connections/send-sms');



router.post('/createorder',(req,res)=>{
    if (req.query?.order_type=='cod') {
        const request = req.app.locals.db.request();
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear().toString().slice(-2);
        request.input('user_id', sql.NVarChar, req.user.id);
        request.input('month',sql.Char,currentMonth);
        request.input('year',sql.Char,currentYear);
        request.input('total_amount',sql.Decimal,req.body.total_amount);
        request.input('pay_mode',sql.VarChar, 'COD');
        request.input('pay_status',sql.VarChar,'pending');
        request.input('order_status',sql.VarChar,'Order Received');
        request.input('addr_id',sql.NVarChar,req.body.addr_id);
        console.log(req.body.addr_id);
        const phoneQuery = `Select ${req.user.type==='prime'?'user_mobile_number as num from PrimeUsers':'phone as num from users'} where user_id=@user_id`
        request.query('DECLARE @OrderIdTable TABLE(order_id nvarchar(50)); Insert into Orders(ordered_month, ordered_year,user_id,total_amount,payment_status,payment_mode,order_status,addr_id) OUTPUT Inserted.order_id into @OrderIdTable values(@month,@year,@user_id,@total_amount,@pay_status,@pay_mode,@order_status,@addr_id);Select order_id from @OrderIdTable',(queryErr,result)=>{
            if(!queryErr) {

                SendOrderConfirmationMSG({order_id : result.recordset[0].order_id, amount : parseFloat(req.body.total_amount), user : req.user});
                res.json({res:true, action:true});
            } else {
                console.log(queryErr)
                res.json({res:true, action:false});
            }
        });
    } else if (req.query?.order_type=='online') {
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
    } else {
        res.json({res:true, action:false});
    }
    
});

router.post('/all',(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('user_id', sql.NVarChar, req.body.user_id);
    request.query('select order_id, total_amount, payment_status,payment_mode, order_status,payment_id from Orders where user_id=@user_id',(queryErr,result)=>{
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
        request.input('order_status',sql.VarChar,'Order Received');
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

router.get('/get_one',(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('order_id',sql.NVarChar, req.body.order_id);

    request.query('select o.id,o.order_id, o.total_amount, o.payment_status, o.payment_mode, o.order_status,addr.addr_id,addr.addr_name, addr.addr_first_line, addr.addr_second_line, addr.addr_city, addr.addr_state, addr.addr_phone,addr.addr_pincode, itm.sale_price,itm.regular_price,itm.prime_price, itm.item_weight, oitm.quantity,p.product_name, p.category  from Orders as o join AddressBook as addr on o.addr_id=addr.addr_id join OrderItems as oitm on o.order_id=oitm.order_id join items as itm on oitm.item_id=itm.item_id join products as p on itm.product_id=p.product_id where o.order_id=@order_id'
    ,(queryErr,result)=>{
        if(!queryErr) {
            res.json({res:true, order : result.recordset});
        } else {
            console.log(queryErr);
            res.json({res:false});
        }
    });
})

module.exports = router;
