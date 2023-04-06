const Razorpay = require('razorpay');
require('dotenv').config();
let razorInstance;
try {
 razorInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
} catch (error) {
    console.log("Something went wrong");
}

module.exports  = razorInstance;