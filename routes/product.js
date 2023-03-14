const fs = require('fs');
const csv = require('csv-parser');
const sql = require('mssql');
const router = require('express').Router();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWrite = createCsvWriter({
    path : 'product_list_segregated.csv'
});
function getRandomPrice() {
    const random_price = Math.floor(Math.random() * (300 - 50 + 1) + 50);
    const sale_price = random_price - (random_price* 5/100);
    const ministore = random_price - (random_price*15/100);
    return {price :random_price, sale_price : sale_price, ministore : ministore};
}

let category; 
let first = false;
let img,flag = false;

router.get('/update',(req,res)=>{

fs.createReadStream('/Users/naresh_dev/Developments/MIC-Backend/routes/product_lists.csv')
.pipe(csv())
.on('data',(data)=>{
    if (!first) {
        category = data.Categories;
        img = data.Images;
        first = true;
    } else {
        if (data.Categories === '' && data.Images===''){
            
            data.Categories = category;
            
        } else if (data.Categories != category && data.Images!=img) {
            category = data.Categories;
        }
        if (data.Images === '') {
            data.Images = img;
            flag = true;
        }else if (data.Images !=img) {
            img = data.Images;
            flag = false;
        }
    } 
    if (data.ID!=undefined && data.Categories != undefined && flag) {
     const price = getRandomPrice();   
     insertDataToDB(data.Name ,data.Categories, price.price, price.sale_price, price.ministore, data.weight, data.Images);   
    }
    console.log(data.ID, );
    
}).on('end',()=>{
    console.log('Successfully read');
});
    async function  insertDataToDB(name,cat,rp,sp,mp,weight,images){
        const request = req.app.locals.db.request();
        request.input('name',sql.NVarChar,name);
        request.input('cat',sql.NVarChar,cat);
        request.input('rp',sql.Decimal,rp);
        request.input('sp',sql.Decimal,sp);
        request.input('mp', sql.Decimal,mp);
        request.input('weight',sql.NVarChar,weight);
        request.input('img',sql.NVarChar(100),images);
        const result = await request.query('insert into items(item_name,sale_price,regular_price,ministore_price,item_weight,category,images) values(@name,@sp,@rp,@mp,@weight,@cat,@img)');
        console.log(result);
    }
});

router.get('/',(req,res)=>{
    try {
    req.app.locals.db.query('select * from items', (queryErr, result)=>{
        res.json({res:true, products : result.recordset});
    });
    } catch (err) {
        console.err(err);
        res.json({res:false});
    }
});

  


module.exports = router;