require('dotenv').config;
const sql = require('mssql');
const axios = require('axios');
const sqlConnect = require('./sql-connect');

const token = process.env.SMSAuthKey + ':' + process.env.SMSAuthToken;
const base64Token = Buffer.from(token).toString('base64');
const authHeader = "Basic " + base64Token;

const GenerateOTP = ()=>{
    var otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

const SendSMS = async (bodyData)=>{

    try {
        const smsUrl = process.env.SMSUrl;
        const smsData = {
            SenderId : 'AATRAL',
            Text : bodyData.Text,
            Number : bodyData.Number,
            Tool : 'API',
        }
        const smsOptions = {
            headers : {
            "Content-Type" : "application/json",
            "Authorization" : authHeader,
            },
        }
        const result = await axios.post(smsUrl,JSON.stringify(smsData),smsOptions);
        if (!result.data.Success) {
            console.log(result.data.Message);
        }
        return result.data;
    } catch (err) {
        console.log(err);
        return {Success : false};
    }
}

const SendOTP = async (bodyData)=>{
    try {
       const otp = GenerateOTP();
        const smsText = `${otp} is your OTPINDIA One-Time Password. Do not share it with anyone-AATRAL ORGANCIS PVT.LTD`;
        const result = await SendSMS({Text : smsText, Number : bodyData.Number});
        if (result.Success) {
            const savedResult = await sqlConnect().then(async connection=>{
                const request = new sql.Request(connection);
                request.input('number',sql.Char,bodyData.Number);
                request.input('id',sql.NVarChar,result.MessageUUID);
                request.input('otp',sql.Int, otp);
                const sqlQuery = `INSERT INTO OTPSMS(msg_id, otp,num) values(@id,@otp,@number)`;
                const queryResult =  await request.query(sqlQuery);
                if (queryResult.rowsAffected[0] == 1) {
                    return {success : true, msg_id : result.MessageUUID};
                } else {
                    if (err) {
                        console.log(err);
                        return {success : false}
                    }   
                }
            })
            .catch(err=>{
                console.error(err);
                return {success : false}
            });
            return savedResult;
        } else {
            console.log(result)
            return {success : false}
        }
    } catch (err) {
        console.error(err);
        return {success : false}
        
    }
    
    
    
}

const SendMobileVerification = async (bodyData)=>{
    try {
        const otp = GenerateOTP();
        const smsText = `${otp} is your OTP for mobile number verification - AATRAL ORGANICS PVT.LTD`;
        const result = await SendSMS({Number : bodyData.Number, Text : smsText});
        if(result.Success) {
            const savedResult = await sqlConnect().then(async connection=>{
                const request = new sql.Request(connection);
                request.input('number',sql.Char,bodyData.Number);
                request.input('id',sql.NVarChar,result.MessageUUID);
                request.input('otp',sql.Int, otp);
                const sqlQuery = `INSERT INTO OTPSMS(msg_id, otp,num) values(@id,@otp,@number)`;
                const queryResult =  await request.query(sqlQuery);
                if (queryResult.rowsAffected[0] == 1) {
                    return {success : true, msg_id : result.MessageUUID};
                } else {
                    if (err) {
                        console.log(err);
                        return {success : false}
                    }   
                }
            });
        } else {
            return {success : false}
        }
    } catch (err) {
        console.log(err);
        return {success : false}
    }
}

const SendWelcomeMSG =  async (bodyData)=>{
    const smsText=`Dear Prime Member, Welcome to Aatral Family Your Registration is successful in OTPINDIA eportal.
                    Your User id ${bodyData.user_id} and password ${bodyData.password}-AATRAL ORGANICS PVT.LTD`;
    const result = await SendSMS({Text : smsText, Number : bodyData.Number});
    return {success : result.Success};
}

const SendOrderConfirmationMSG = async (bodyData)=>{
    const smsText = `Thank you for your order, Your order Id:${bodyData.order_id} and amount Rs.${bodyData.amount} - AATRAL ORGANCIS PVT.LTD`;
    const phoneQuery = `Select ${bodyData.user.type==='prime'?'user_mobile_number as num from PrimeUsers':'phone as num from users'} where user_id=@user_id`
    const connection = await sqlConnect();
    const request = new sql.Request(connection);
    request.input('user_id', sql.VarChar, bodyData.user.id);
    const GetNumber = request.query(phoneQuery);
    const result = await SendSMS({Text : smsText, Number : (await GetNumber).recordset[0].num});
    return {success : result.Success};
}

const SendWalletTransacMSG = async (bodyData)=>{
    try {
        const number = GenerateOTP();
        const smsText = `OTP for debit of Rs. ${bodyData.tranacAmount} from your wallet ac is ${number} - AATRAL ORGANICS PVT.LTD`;
        const result = await SendSMS({Text : smsText, Number : bodyData.Number});
        if(result.Success) {
            const savedResult = await sqlConnect().then(async connection=>{
                const request = new sql.Request(connection);
                request.input('number',sql.Char,bodyData.Number);
                request.input('id',sql.NVarChar,result.MessageUUID);
                request.input('otp',sql.Int, otp);
                const sqlQuery = `INSERT INTO OTPSMS(msg_id, otp,num) values(@id,@otp,@number)`;
                const queryResult =  await request.query(sqlQuery);
                if (queryResult.rowsAffected[0] == 1) {
                    return {success : true, msg_id : result.MessageUUID};
                } else {
                    if (err) {
                        console.log(err);
                        return {success : false}
                    }   
                }
            });
        } else {
            return {success : false}
        }
        
    } catch (err) {
        console.log(err);
        return {success : false};
    }
}

module.exports = {
    SendOTP,
    SendMobileVerification,
    SendWelcomeMSG,
    SendOrderConfirmationMSG, 
    SendWalletTransacMSG,
}

