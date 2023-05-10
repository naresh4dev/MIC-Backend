require('dotenv').config();
const csv = require('csv-parser');
const router = require('express').Router();
const busboy = require('connect-busboy');
const sql = require('mssql');

router.post('/products/upload/:type',(req,res)=>{
    if (req.params.type == 'bulk') {
        req.pipe(req.busboy);
        req.busboy.on('file', async(fieldName, file, fileName, encoding,mimetype)=>{
            if (mimetype == 'text/csv') {
                return res.json({res:true, action: false, msg : "Invalid file type. Must be CSV"});
            }
            file.pipe(csv())
            .on('data', async(data)=>{
                const request = req.app.locals.db.request();
                request.input('product_name',sql.NVarChar,data.name);
                const productQuery = `Select product_id from Products where product_name=@product_name`;
                const productResult = await request.query(productQuery);
                if (productResult.recordset.length>0) {
                    const product_id = productResult.recordset[0].product_id;
                    request.input('sale_price', sql.Decimal, data.sale_price);
                    request.input('regular_price', sql.Decimal,data.regular_price);
                    request.input('prime_price',sql.Decimal,data.prime_price);
                    request.input('product_id', sql.NVarChar, product_id);
                    request.input('mqty', sql.Int, data.minimum_qty);
                    request.input('item_stock', sql.Int,data.item_stock);
                    request.input('ministore_bonus', sql.Decimal, data.ministore_bonus); 
                    request.input('weight', sql.NVarChar,data.weight);
                    const itemQuery = `Insert into items(sale_price,regular_price,prime_price,ministore_min_qty,ministore_product_bonus,item_weight,item_stock,product_id) 
                                                   values(@sale_price,@regular_price,@prime_price,@mqty,@ministore_bonus,@weight,@item_stock,@product_id)`;
                    await request.query(itemQuery);
                } else {
                    request.input('name',sql.NVarChar,data.name);
                    request.input('category', sql.NVarChar, data.category_name)
                    request.input('description', sql.NVarChar,data.description);
                    request.input('product_tax',sql.Decimal,data.product_tax);
                    request.input('img',sql.NVarChar,data.image_id);
                    const productQuery2 = `Insert Into products(product_name,category,product_description,product_tax,product_image)
                                            values(@name,@category,@description,@product_tax,@img); SELECT SCOPE_IDENTITY() AS ProductId`;
                    const productResult2 = await request.query(productQuery2);
                    const product_id = productResult2.recordset[0].product_id;
                    request.input('sale_price', sql.Decimal, data.sale_price);
                    request.input('regular_price', sql.Decimal,data.regular_price);
                    request.input('prime_price',sql.Decimal,data.prime_price);
                    request.input('product_id', sql.NVarChar, product_id);
                    request.input('mqty', sql.Int, data.minimum_qty);
                    request.input('item_stock', sql.Int,data.item_stock);
                    request.input('ministore_bonus', sql.Decimal, data.ministore_bonus); 
                    request.input('weight', sql.NVarChar,data.weight);
                    const itemQuery = `Insert into items(sale_price,regular_price,prime_price,ministore_min_qty,ministore_product_bonus,item_weight,item_stock,product_id) 
                                                   values(@sale_price,@regular_price,@prime_price,@mqty,@ministore_bonus,@weight,@item_stock,@product_id)`;
                    await request.query(itemQuery);
                }
            })
        });
        req.busboy.on('finish',()=>{
            res.json({res:true,action:true,msg : 'Items Uploaded Successfully'});
        });
    } else if (req.params.type == 'product') {
        req.pipe(req.busboy);
        const formData = new Map();
        req.busboy.on('field',(fieldName,fieldValue)=>{
            formData.set(fieldName,fieldValue);
        });
        req.busboy.on('finish', async ()=>{
            request.input('name',sql.NVarChar,formData.name);
            request.input('category', sql.NVarChar, formData.category_name)
            request.input('description', sql.NVarChar,formData.description);
            request.input('product_tax',sql.Decimal,formData.product_tax);
            request.input('img',sql.NVarChar,formData.image_id);
            const productQuery2 = `Insert Into products(product_name,category,product_description,product_tax,product_image)
                                    values(@name,@category,@description,@product_tax,@img); SELECT SCOPE_IDENTITY() AS ProductId`;
            request.query(productQuery2,(queryErr)=>{
                if(!queryErr){ 
                    res.json({res:true, action : true});
                } else {
                    res.json({res:true, action : false});
                }
            });
                    
        });
    } else if (req.params.type == 'item') {
        req.pipe(req.busboy);
        const formData = new Map();
        req.busboy.on('field',(fieldName,fieldValue)=>{
            formData.set(fieldName,fieldValue);
        });
        req.busboy.on('finish',()=>{
                    request.input('sale_price', sql.Decimal, formData.sale_price);
                    request.input('regular_price', sql.Decimal,formData.regular_price);
                    request.input('prime_price',sql.Decimal,formData.prime_price);
                    request.input('product_id', sql.NVarChar, formData.product_id);
                    request.input('mqty', sql.Int, formData.minimum_qty);
                    request.input('item_stock', sql.Int,formData.item_stock);
                    request.input('ministore_bonus', sql.Decimal, formData.ministore_bonus); 
                    request.input('weight', sql.NVarChar,formData.weight);
                    const itemQuery = `Insert into items(sale_price,regular_price,prime_price,ministore_min_qty,ministore_product_bonus,item_weight,item_stock,product_id) 
                                                   values(@sale_price,@regular_price,@prime_price,@mqty,@ministore_bonus,@weight,@item_stock,@product_id)`;
                    request.query(itemQuery,(queryErr)=>{
                        if(!queryErr) {
                            res.json({res:true,action : true});
                        } else {
                            console.log(queryErr);
                            res.json({res:true, action : false});
                        }
                    });
        });
    } else {
        res.json({res: true, action : false});
    }
});


router.get('/orders/get/:type',(req,res)=>{
    if(req.params.type == 'all'){ 
        req.app.locals.db.query('select * from Orders',(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true, orders:result.recordset});
            } else {
                console.log(queryErr);
                res.json({res:false});
            }
        });
    } else if (req.params.type =='one') {
        const request = req.app.locals.db.request();
        request.input('order_id',sql.NVarChar,req.query.order_id);
        request.query('select * from Orders where order_id=@order_id',(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true, order:result.recordset[0]});
            } else {
                console.log(queryErr);
                res.json({res:false});
            }
        });
    }
});

router.post('/orders',(req,res)=>{

});


router.get('/users',(req,res)=>{
    console.log(req.query.type);
    const request = req.app.locals.db.request();
    var query='';
    if (req.query.type == 'normal') {
        query = "select * from users"
    } else if (req.query.type == 'prime') {
        query = "select * from PrimeUsers"
    } else {
        return res.json({res:false, msg : "Invalid Request type"});
    }
    request.query(query,(queryErr,result)=>{
        if(queryErr){
            console.log(queryErr);
            return res.json({res:false , msg : "Internal Query Error"});
        } 
         
        res.json({res:true, users : result.recordset});
    });
});

router.post('/users/update',(req,res)=>{
    
    const request = req.app.locals.db.request();
    request.input('user_id',sql.NVarChar,req.body.user_id);
    request.input('status',sql.Bit,parseInt(req.body.status));
    request.query('update PrimeUsers set user_status=@status where user_id=@user_id',(queryErr)=>{
        if(queryErr){
            console.log(queryErr);
            return res.json({res:false, msg : "Internal Query Error"});
        }
        res.json({res:true});
    })
});

module.exports = router;