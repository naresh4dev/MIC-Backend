const router = require('express').Router();
const sql = require('mssql');
const fs = require('fs');

router.get('/:image_id', async (req,res)=>{
    try {
        const imageId = req.params.image_id;
        const request = req.app.locals.db.request();
        request.input('id',sql.NVarChar,imageId);
        const query = 'Select * From Images where image_id=@id';
        const result = await request.query(query);
        const buffer = Buffer.from(result.recordset[0].image_data, 'hex');
        
        
        res.setHeader('Content-Type', 'image/jpg');
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    } catch(err) {
        console.log(err.message);
        res.sendStatus(500);
    }
}); 

module.exports = router;