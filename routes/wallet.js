const sql = require('mssql');
const { route } = require('./auth');
const { VerifyOTP } = require('../connections/send-sms');
const isLoggedIn = require('../utility/isLoggedIn');
const router = require('express').Router();

router.post('/transfer', isLoggedIn ,async (req,res)=>{
    const receiver_id = req.body.user_receiver_id;
    const sender_id = req?.user?.id ;
    const amount = parseFloat(req.body.transfer_amount);
    const verification = await VerifyOTP({otp : req.body.user_entered_otp, sms_id : req.body.sms_id});

    if(verification.verify == true){
        const transaction = new sql.Transaction(req.app.locals.db);
        await transaction.begin()
        const request = transaction.request();
        const currentDate = new Date();
        const date = currentDate.getDate();
        const month = currentDate.getMonth()+1 ;
        const year = currentDate.getFullYear();
        request.input('date', sql.Char(2), String(date).padStart(2, '0'));
        request.input('month', sql.Char(2), String(month).padStart(2, '0'));
        request.input('year', sql.Char(4), String(year));  
        request.input('sender_id', sql.NVarChar, sender_id);
        request.input('receiver_id', sql.NVarChar, receiver_id);
        request.input('amount', sql.Decimal, parseFloat(amount));   
        request.input('stats',sql.NVarChar,'SUCCESS');
        try {
            
            // Check sender's wallet balance
            const checkBalanceQuery = 'Select wallet_amount from PrimeUsersWallet where prime_user_id=@sender_id and wallet_status=1';
            const balanceQueryResult = await request.query(checkBalanceQuery);
            
            if(balanceQueryResult.recordset[0].wallet_amount < amount){
                throw new Error("Insufficient balance in the sender's wallet");
            }
            // Check if Receiver is available and active
            const checkReceiverQuery = `SELECT user_status FROM PrimeUsers WHERE user_id = @receiver_id`;
            const receiverResult = await request.query(checkReceiverQuery);
            if(receiverResult.recordset.length == 0) {
                throw new Error("Receiver's user ID does not exist.");
            }
            if(!receiverResult.recordset[0].user_status) {
                throw new Error("Receiver's account is not active.");
            }
            // Update in the Sender's and Receiver's Wallet and Log the transaction 
            const transactionQuery = `
            UPDATE PrimeUsersWallet SET wallet_amount = wallet_amount - @amount WHERE prime_user_id=@sender_id;
            UPDATE PrimeUsersWallet SET wallet_amount = wallet_amount + @amount WHERE prime_user_id=@receiver_id;
            INSERT INTO WalletTransaction (sender_user_id, receiver_user_id, transact_amount,transaction_date, transaction_month,transaction_year, transaction_status) VALUES (@sender_id,@receiver_id,@amount,@date,@month,@year,@stats)`;
            await request.query(transactionQuery);
             
             
            //Commit the transaction
            await transaction.commit()

            res.json({res:true, action : true});
        } catch (err) {
            console.error(err);
            res.json({res:false , action : false,error_msg : err.message});
            
            if(transaction){
                try {
                    await transaction.rollback();
                    await transaction.begin();
                    request.input('msg',sql.NVarChar,err.message);
                    request.input('status',sql.NVarChar,'FAILURE');
                    const insertTransactionQuery = `INSERT INTO WalletTransaction (sender_user_id, receiver_user_id, transact_amount,transaction_date, transaction_month,transaction_year, transaction_status,error_msg) VALUES (@sender_id,@receiver_id,@amount,@date,@month,@year,@status,@msg)`;
                    await request.query(insertTransactionQuery);
                    await transaction.commit();
                } catch (rollback) {
                    console.error(rollback);
                }
            }
        }
        

    } else {
        
    }
});

router.post('/withdraw',async (req,res)=>{
    const verification = await VerifyOTP({otp : req.body.user_entered_otp, sms_id : req.body.sms_id })
    if (verification.verify) {
        const transaction = new sql.Transaction(req.app.locals.db);
        try {
            await transaction.begin();
            const request = transaction.request();
            const currentDate = new Date();
            const date = currentDate.getDate();
            const month = currentDate.getMonth()+1 ;
            const year = currentDate.getFullYear();
            request.input('date', sql.Char(2), String(date).padStart(2, '0'));
            request.input('month', sql.Char(2), String(month).padStart(2, '0'));
            request.input('year', sql.Char(4), String(year));  
            request.input('bname',sql.NVarChar,req.body.bank_name);
            request.input('ifsc', sql.NVarChar, req.body.bank_ifsc);
            request.input('number',sql.NVarChar,req.body.account_number);
            request.input('uname',sql.NVarChar, req.body.beneficiary_name);
            request.input('amount',sql.Decimal, parseFloat(req.body.withdraw_amount));
            request.input('id',sql.NVarChar,req.user.id);
            // Check Balance 
            const checkBalanceQuery = 'Select wallet_amount from PrimeUsersWallet where prime_user_id=@id and wallet_status=1';
            const balanceQueryResult = await request.query(checkBalanceQuery);

            if(balanceQueryResult.recordset[0].wallet_amount < parseInt(req.body.withdraw_amount)){
                throw new Error("Insufficient balance in the sender's wallet");
            }
            //Save the withdraw request and update the wallet
            const insertQuery = `
            UPDATE PrimeUsersWallet SET wallet_amount = wallet_amount - @amount WHERE prime_user_id=@id;
            INSERT INTO WithdrawalRequests (bank_name, ifsc_code, account_number, beneficiary_name, amount,user_id, withdraw_date,withdraw_month,withdraw_year)
            VALUES (@bname, @ifsc, @number, @uname, @amount,@id,@date,@month,@year)`;
            await request.query(insertQuery);
            //Commit the transaction and save the changes
            await transaction.commit();

            res.json({res:true, action : true});
        } catch(err){
            console.error(err);
            await transaction.rollback();
            res.json({res:false, error_msg : err.message});
        }
    } else {
        return res.json({res:true,action : false, error_msg : 'Invalid OTP'});
    }
});

router.get('/transactions', isLoggedIn, (req,res)=>{
    try {
        let transactionQuery;
        if (req.query.type=='w2w') {
             transactionQuery = `
        Select 
            wallet_transaction_id, 
            transaction_date, 
            transaction_month, 
            transaction_year, 
            created_at, 
            transact_amount,
            transaction_status, 
            'Transfer' as method, 
            case 
                when sender_user_id=@id then 'SENT' 
                when receiver_user_id=@id then 'RECEIVED' 
                END  as mode  
        from WalletTransaction 
        where 
            sender_user_id=@id 
            or 
            receiver_user_id=@id
        UNION all 
        select withdraw_request_id, withdraw_date,withdraw_month, withdraw_year, created_at, amount, withdraw_status, 'Withdraw' as method, 'REQ' as mode from WithdrawalRequests where user_id =@id

        order by created_at DESC;`
        } else if (req.query.type == 'p2w') {
            transactionQuery = `SELECT * from PointsToWallet where user_id=@id order by created_at DESC;`;
        } else {
            return res.json({res:false, error_msg : 'Invalid request query'});
        }
        const request = req.app.locals.db.request();
        request.input('id',sql.NVarChar,req.user.id);
        request.query(transactionQuery, (err, transactionQueryResult)=>{
            if(!err) {
                res.json({res:true, transactions : transactionQueryResult.recordset});
            } else {
                console.error(err);
                res.json({res:false, error_msg : 'Internal Server Error'});
            }
        });
    } catch(err) {

    }
    
});

module.exports = router;