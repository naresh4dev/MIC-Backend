const sqlConnect = require('../connections/sql-connect');
const sql = require('mssql');

async function CalculatePointsToWalletTransfer() {
 try {
    const connection = await sqlConnect();
    const transaction = new sql.Transaction(connection);
    await transaction.begin();
    const request = new sql.Request(transaction);
    
    const result = await request.execute('UplineToDownLinePointsTransfer');
    
    
    

    await transaction.commit();
 } catch (err) {
    console.log('Points To Wallet Transfer Error',err);
 } 
}


module.exports = CalculatePointsToWalletTransfer;