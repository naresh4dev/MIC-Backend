require('dotenv').config();
const razorInstance = require('../connections/razorpay-connect');
const router = require('express').Router();
const bodyParser = require('body-parser');
const sql = require('mssql');
const { SendOrderConfirmationMSG } = require('../connections/send-sms');
const isLoggedIn = require('../utility/isLoggedIn');
const CalculateCart = require('../utility/calculateCart');


router.post('/createorder',isLoggedIn,async (req,res)=>{
    const transaction = new sql.Transaction(req.app.locals.db);
    try {
        await transaction.begin();
        const request = transaction.request();
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear().toString().slice(-2);
        request.input('user_id',sql.NVarChar,req.user.id);
        request.input('discount',sql.Decimal(10,2),calculations.totalDiscountPrice);
        request.input('total_amount',sql.Decimal(10,2),calculations.overallTotal);
        request.input('type',sql.Char,req.user.type=='prime'?'P':'N');
        request.input('month',sql.Char,currentMonth);
        request.input('year',sql.Char,currentYear);
        request.input('coupon',sql.Bit,req.query.is_coupon_apllied=='y'?1:0);
        request.input('delivery_charge',sql.Decimal(10,2),calculations.delivery_charge);
        request.input('addr_id',sql.NVarChar,req.body.addr_id);
        request.input('order_status',sql.VarChar,'Order Received');
        const result = await request.query('select cart.cart_id, item.item_id, item.quantity,itd.sale_price,itd.regular_price, itd.prime_price, itd.ministore_min_qty, itd.item_weight, itd.item_stock, itd.eligiblity_to_redeem_discount_coupon ,itd.ministore_product_bonus,p.product_id ,p.product_name, p.product_tax, p.product_image_id,p.category,i.image_data from CartTable as cart join CartItems as item on  cart.cart_id=item.cart_id join items as itd on itd.item_id=item.item_id join products as p on p.product_id=itd.product_id join Images as i on p.product_image_id=i.image_id where cart.user_id=@user_id;');  
        const addressCalc = await request.query('select * from AddressCalc');
        let calculations;
        if(req.query.is_coupon_apllied == 'y') {
            calculations = CalculateCart(req.user.type, result.recordset,true,req.query.pincode,addressCalc.recordset[0]);
            const checkDiscountCouponBalance = request.query('Select discount_coupon from PrimeUsersWallet where prime_user_id=@user_id');
            if (checkDiscountCouponBalance.recorderset[0].discount_coupon < calculations.totalDiscountPrice) 
                throw new Error('Insufficient Discount Coupon Balance');
            const updateDiscountCouponQuery = `Update PrimeUsersWallet set discount_coupon=discount_coupon-@discount where prime_user_id=@user_id`; 
        } else {
            calculations = CalculateCart(req.user.type, result.recordset,false,req.query.pincode,addressCalc.recordset[0]);
        }
        
        if (req.query?.order_type=='cod') {
            request.input('pay_mode',sql.VarChar, 'COD');
            request.input('pay_status',sql.VarChar,'pending');
            const phoneQuery = `Select ${req.user.type==='prime'?'user_mobile_number as num from PrimeUsers':'phone as num from users'} where user_id=@user_id`
            const result = await request.query('DECLARE @OrderIdTable TABLE(order_id nvarchar(50)); Insert into Orders(ordered_month, ordered_year,user_id,total_amount,payment_status,payment_mode,order_status,addr_id,is_coupon_applied,delivery_charge,total_discount) OUTPUT Inserted.order_id into @OrderIdTable values(@month,@year,@user_id,@total_amount,@pay_status,@pay_mode,@order_status,@addr_id,@coupon,@delivery_charge,@discount);Select order_id from @OrderIdTable');
            SendOrderConfirmationMSG({order_id : result.recordset[0].order_id, amount : parseFloat(calculations.overallTotal), user : req.user});
            res.json({res:true, action:true});
        } else if (req.query?.order_type=='online') {
            razorInstance.orders.create({
                amount : parseInt(((calculations.overallTotal)*100)),
                currency : 'INR'
            },(err,data)=>{
                if (err) {
                    console.log(err);
                    res.json({res:false});
                } else {
                    res.json({res:true,data:data,key : process.env.RAZORPAY_KEY_ID, total:calculations.overallTotal});
                }
            });
        } else if (req.query.order_type=='wallet') {
            const checkBalanceQuery = `Select wallet_amount from PrimeUsersWallet where prime_user_id=@user_id`;
            const checkBalance = await request(checkBalanceQuery);
            if(checkBalance.recordset[0].wallet_balance < calculations.overallTotal)
                throw new Error('Insufficient Wallet Balance');
            const updateWalletQuery = 'Update PrimeUsersWallet set wallet_amount=wallet_amount-@total_amount where prime_user_id=@user_id';
            const updateWallet = await request.query(updateWalletQuery);
            if(updateWallet.rowsAffected[0]==1) {
                request.input('pay_mode',sql.VarChar, 'wallet');
                request.input('pay_status',sql.VarChar,'paid');
                const phoneQuery = `Select ${req.user.type==='prime'?'user_mobile_number as num from PrimeUsers':'phone as num from users'} where user_id=@user_id`
                const result = await request.query('DECLARE @OrderIdTable TABLE(order_id nvarchar(50)); Insert into Orders(ordered_month, ordered_year,user_id,total_amount,payment_status,payment_mode,order_status,addr_id,is_coupon_applied,delivery_charge,total_discount) OUTPUT Inserted.order_id into @OrderIdTable values(@month,@year,@user_id,@total_amount,@pay_status,@pay_mode,@order_status,@addr_id,@coupon,@delivery_charge,@discount);Select order_id from @OrderIdTable');
                SendOrderConfirmationMSG({order_id : result.recordset[0].order_id, amount : parseFloat(calculations.overallTotal), user : req.user});
                res.json({res:true, action:true});
            }
        } else {
            res.json({res:true, action:false, error_msg : 'Invalid Order Type Request'});
        }
    } catch (err) {
        transaction.rollback();
        console.log(err)
        res.json({res:true, action:false, error_msg : err.message});
    }
});

router.get('/calculate',isLoggedIn, async (req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('user_id',sql.NVarChar,req.user.id);
        const result = await request.query('select cart.cart_id, item.item_id, item.quantity,itd.sale_price,itd.regular_price, itd.prime_price, itd.ministore_min_qty, itd.item_weight, itd.item_stock, itd.eligiblity_to_redeem_discount_coupon ,itd.ministore_product_bonus,p.product_id ,p.product_name, p.product_tax, p.product_image_id,p.category,i.image_data from CartTable as cart join CartItems as item on  cart.cart_id=item.cart_id join items as itd on itd.item_id=item.item_id join products as p on p.product_id=itd.product_id join Images as i on p.product_image_id=i.image_id where cart.user_id=@user_id;');  
        const addressCalc = await request.query('select * from AddressCalc');
        let calculations;
        if(req.query.is_coupon_apllied == 'y') {
            calculations = CalculateCart(req.user.type, result.recordset,true,req.query.pincode,addressCalc.recordset[0]);
            const checkDiscountCouponBalance = request.query('Select discount_coupon from PrimeUsersWallet where prime_user_id=@user_id');
            if (checkDiscountCouponBalance.recorderset[0].discount_coupon < calculations.totalDiscountPrice) 
                throw new Error('Insufficient Discount Coupon Balance');
        } else {
            calculations = CalculateCart(req.user.type, result.recordset,false,req.query.pincode,addressCalc.recordset[0]);
        }
        res.json({res:true, calculations,action : true});
    } catch(err) {
        console.log(err);
        res.json({res:false, error_msg : err.message});
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

router.post('/get_one',(req,res)=>{
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
});

module.exports = router;
