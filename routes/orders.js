require('dotenv').config();
const razorInstance = require('../connections/razorpay-connect');
const router = require('express').Router();
const bodyParser = require('body-parser');


router.use(bodyParser.urlencoded(true));

router.post('/createorder',(req,res)=>{
    razorInstance.orders.create({
        amount : (parseInt(req.body.total_amount)*100),
        currency : 'INR'
    },(err,data)=>{
        res.json({err : err, data : data, key : process.env.RAZORPAY_KEY_ID});
    });
});

router.post('/payment',(req,res)=>{
    
});

module.exports = router;
