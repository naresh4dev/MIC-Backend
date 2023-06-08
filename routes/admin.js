require('dotenv').config();
const csv = require('csv-parser');
const router = require('express').Router();
const busboy = require('busboy');

const sql = require('mssql');
const sqlConnect = require('../connections/sql-connect');

router.post('/products/upload/:type', async (req, res) => {
    if (req.params.type == 'bulk') {
        try {
     
        const productMap = new Set();
        const getExistingProductName = await req.app.locals.db.query('Select product_name from products');
        getExistingProductName.recordset.map((product)=>productMap.add(product.product_name));
        
        req.busboy.on('file', async (fieldName, file, fileName, encoding, mimetype) => {
            try {
                // if (mimetype != 'text/csv') {
                //     return res.json({res:true, action: false, error_msg : "Invalid file type. Must be CSV"});
                // }
                console.log('Here');
                
                file.pipe(csv())
                    .on('data', async (data) => {
                        try {
                            
                            const request = req.app.locals.db.request();
                            request.input('product_name', sql.NVarChar, data.name);
                            request.input('category', sql.NVarChar, data.category_name)
                            request.input('description', sql.NVarChar, data.description);
                            request.input('sub_cat', sql.NVarChar, data.sub_category);
                            request.input('product_tax', sql.Decimal, data.product_tax);
                            request.input('img', sql.NVarChar, data.image_id);
                            request.input('sale_price', sql.Decimal, data.sale_price);
                            request.input('regular_price', sql.Decimal, data.regular_price);
                            request.input('prime_price', sql.Decimal, data.prime_price);
                            request.input('mqty', sql.Int, data.minimum_qty);
                            request.input('item_stock', sql.Int, data.item_stock);
                            request.input('ministore_bonus', sql.Decimal, data.ministore_bonus);
                            request.input('weight', sql.NVarChar, data.weight);
                            request.input('eligible',sql.Int, data.redeem_points);
                            
                            if (productMap.has(data.name)) {
                                console.log(`Skipped insertion for product: ${data.name}`);
                                const getProductIdQuery = `SELECT product_id FROM products WHERE product_name=@product_name`;
                                const productIdResult = await request.query(getProductIdQuery);
                                if (productIdResult.recordset.length > 0 ) {
                                    const product_id = productIdResult.recordset[0].product_id;
                                    request.input('product_id', sql.NVarChar, product_id);
                                }

                                
                            } else {
                                productMap.add(data.name);
                                const productInsertQuery = `IF EXISTS (SELECT 1 FROM products WHERE product_name=@product_name)
                                BEGIN
                                  SELECT product_id FROM products WHERE product_name=@product_name
                                END
                                ELSE
                                BEGIN
                                  INSERT INTO products (product_name, category, product_description, product_tax, product_image_id, subcategory)
                                 
                                  VALUES (@product_name, @category, @description, @product_tax, @img, @sub_cat);
                                END`;
                                request.query(productInsertQuery);
                               
                                  
                            }
                            const itemQuery = `INSERT INTO items (sale_price, regular_price, prime_price, ministore_min_qty, ministore_product_bonus, item_weight, item_stock, product_id,eligiblity_to_redeem_discount_coupon) 
                                                 VALUES (@sale_price, @regular_price, @prime_price, @mqty, @ministore_bonus, @weight, @item_stock,(select product_id from products where product_name=@product_name), @eligible);
                                            `;
                             request.query(itemQuery);
                        } catch (err) {
                            
                            console.error(err);
                        }

                    })
                    

            } catch (error) {
                
                console.error(error);
                res.status(500).json({
                    res: false,
                    action: false,
                    error_msg: 'Internal Server Error'
                  });
            }

        });
        req.busboy.on('error', (err) => {
            console.error(err);
          });
        req.busboy.on("finish", () => {
            
            res.json({
                res: true,
                action: true,
                msg: 'Items Uploaded Successfully'
            });
        });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                res: false,
                action: false,
                error_msg: 'Internal Server Error'
              });
        }
        req.pipe(req.busboy);
    } else if (req.params.type == 'product') {
        req.pipe(req.busboy);
        const formData = new FormData();
        req.busboy.on('field', (fieldName, fieldValue) => {
            formData.append(fieldName, fieldValue);
        });
        req.busboy.on('finish', async () => {
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, formData.get('name'));
            request.input('category', sql.NVarChar, formData.get('category_name'));
            request.input('sub_cat',sql.NVarChar, formData.get('sub_category'));
            request.input('description', sql.NVarChar, formData.get('description'));
            request.input('product_tax', sql.Decimal, formData.get('product_tax'));
            request.input('img', sql.NVarChar, formData.get('image_id'));
            const productQuery2 = `Insert Into products(product_name,category,product_description,product_tax,product_image,subcategory)
                                    values(@name,@category,@description,@product_tax,@img,@sub_cat); `;
            request.query(productQuery2, (queryErr) => {
                if (!queryErr) {
                    res.json({
                        res: true,
                        action: true
                    });
                } else {
                    console.log(queryErr);
                    res.json({
                        res: true,
                        action: false,
                        error_msg : 'Internal Server Error'
                    });
                }
            });

        });
    } else if (req.params.type == 'item_new') {
        req.pipe(req.busboy);
        const formData = new Map();
        req.busboy.on('field', (fieldName, fieldValue) => {
            formData.set(fieldName, fieldValue);
        });
        req.busboy.on('finish', () => {
            request.input('sale_price', sql.Decimal, formData.sale_price);
            request.input('regular_price', sql.Decimal, formData.regular_price);
            request.input('prime_price', sql.Decimal, formData.prime_price);
            request.input('product_id', sql.NVarChar, formData.product_id);
            request.input('mqty', sql.Int, formData.minimum_qty);
            request.input('item_stock', sql.Int, formData.item_stock);
            request.input('ministore_bonus', sql.Decimal, formData.ministore_bonus);
            request.input('weight', sql.NVarChar, formData.weight);
            const itemQuery = `Insert into items(sale_price,regular_price,prime_price,ministore_min_qty,ministore_product_bonus,item_weight,item_stock,product_id) 
                                                   values(@sale_price,@regular_price,@prime_price,@mqty,@ministore_bonus,@weight,@item_stock,@product_id)`;
            request.query(itemQuery, (queryErr) => {
                if (!queryErr) {
                    res.json({
                        res: true,
                        action: true
                    });
                } else {
                    console.log(queryErr);
                    res.json({
                        res: true,
                        action: false
                    });
                }
            });
        });
    } else if (req.params.type == 'status') {

        const request = req.app.locals.db.request();
        request.input('status', sql.Bit, parseInt(req.body.status));
        request.input('id', sql.NVarChar, req.body.product_id);
        request.query('update products set product_status=@status where product_id=@id', (queryErr) => {
            if (queryErr) {
                console.log(queryErr);
                return res.json({
                    res: true,
                    action: false
                });
            }
            res.json({
                res: true,
                action: true
            });
        });
    } else if (req.params.type =='item_update') {

    } else if (req.params.type == 'item_delete'){
        const request = req.app.locals.db.request();
        request.input('id', sql.NVarChar, req.body.item_id);
        request.query('update set item items where item_id=@id', (queryErr) => {
            if (queryErr) {

            } else {

            }
        });
    } else {
        res.json({
            res: true,
            action: false
        });
    }
});

router.get('/products/:mode', (req, res) => {
    const request = req.app.locals.db.request();
    if (req.params.mode == 'get_all') {
        const productQuery = `select distinct p.id,p.product_id,p.product_status,p.product_name,p.category,p.subcategory,(select count(item_id) from items where product_id=p.product_id group by product_id) as item_count from products as p`;
        request.query(productQuery, (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    products: result.recordset
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: true
                });
            }
        });
    } else if (req.params.mode == 'get_one') {
        const productQuery = `select p.id,p.product_name,p.product_status, c.category_name, itm.sale_price,itm.regular_price,itm.prime_price,itm.item_stock,itm.minimum_qty, itm.ministore_bonus, itm.weight from products as p join items as itm on p.product_id=itm.product_id join category as c on p.category=c.category_id where p.product_id=@product_id;`;
        request.input('product_id', sql.NVarChar, req.query.product_id);
        request.query(productQuery, (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    product: result.recordset
                    });
            } else {
                console.log(queryErr);
                res.json({
                    res: false,
                });
            }
        });
    }
});


router.get('/orders/get/:type', (req, res) => {
    if (req.params.type == 'all') {
        req.app.locals.db.query('select distinct o.id,o.order_id, o.total_amount, o.payment_mode, o.payment_status, o.order_status, o.user_id ,(select count(item_id) from OrderItems where order_id=o.order_id group by order_id) as item_count from Orders as o join OrderItems as items on o.order_id=items.order_id', (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    orders: result.recordset
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false
                });
            }
        });
    } else if (req.params.type == 'one') {
        const request = req.app.locals.db.request();
        request.input('order_id', sql.NVarChar, req.query.order_id);
        request.query('select distinct o.order_id, o.total_amount, o.payment_mode, o.payment_status, o.order_status, o.user_id ,(select count(item_id) from OrderItems where order_id=o.order_id group by order_id) as item_count from Orders as o join OrderItems as items on o.order_id=items.order_id where o.order_id=@order_id', (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    order: result.recordset[0]
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false
                });
            }
        });
    } else {
        res.json({res:false, error_msg : "Invalid parameter request"});
    }
});

router.post('/orders/status', (req, res) => {
    const request = req.app.locals.db.request();
    if (req.query.type === "order_status") {
        request.input('status', sql.NVarChar, req.body.order_status);
        request.input('order_id', sql.NVarChar, req.body.order_id);
        request.query('update Orders set order_status=@status where order_id=@order_id', (queryErr) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    action: true
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: true,
                    action: false
                });
            }
        });
    } else if (req.query.type === "payment_status") {
        request.input('pay_status', sql.NVarChar, 'paid');
        request.input('order_id', sql.NVarChar, req.body.order_id);
        request.query('update Orders set payment_status=@pay_status where order_id=@order_id', (queryErr) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    action: true
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: true,
                    action: false
                });
            }
        });
    } else {

    }
});

router.get('/users', (req, res) => {
    console.log(req.query.type);
    const request = req.app.locals.db.request();
    var query = '';
    if (req.query.type == 'normal') {
        query = "select * from users"
    } else if (req.query.type == 'prime') {
        query = "select * from PrimeUsers"
    } else {
        return res.json({
            res: false,
            msg: "Invalid Request type"
        });
    }
    request.query(query, (queryErr, result) => {
        if (queryErr) {
            console.log(queryErr);
            return res.json({
                res: false,
                msg: "Internal Query Error"
            });
        }

        res.json({
            res: true,
            users: result.recordset
        });
    });
});

router.post('/users/update', (req, res) => {

    const request = req.app.locals.db.request();
    request.input('user_id', sql.NVarChar, req.body.user_id);
    request.input('status', sql.Bit, parseInt(req.body.status));
    request.query('update PrimeUsers set user_status=@status where user_id=@user_id', (queryErr) => {
        if (queryErr) {
            console.log(queryErr);
            return res.json({
                res: false,
                msg: "Internal Query Error"
            });
        }
        res.json({
            res: true
        });
    });
});

router.get('/plan/:mode',(req,res)=>{
    const request = req.app.locals.db.request();
    if (req.params.mode == 'get_all') {
        request.query('select * from PrimePackagePlan', (queryErr, result) => {
            if(!queryErr) 
                res.json({res:true, plans : result.recordset});
            else {
                console.log(queryErr);
                res.json({res:false, error_msg : "Internal Server Error"});
            }
        });
    } else if (req.params.mode == 'get_one') {
        request.input('plan_id', sql.NVarChar, req.query.plan_id);
        request.query('select * from PrimePackagePlan where plan_id=@plan_id', (queryErr, result) => {
            if(!queryErr) {
                res.json({res:true, plans : result.recordset});
            } else {
                console.log(queryErr);
                res.json({res:false, error_msg : 'Internal Server Error'});
            }
        });
    } else {
        res.json({res:false, error_msg : "Invalid Parameter Request"});
    }
});

router.post('/plan/:mode', (req, res) => {
    const request = req.app.locals.db.request();
    if (req.params.mode == 'add') {
        request.input('name',sql.NVarChar, req.body.plan_name);
        request.input('features',sql.NVarChar, req.body.plan_features);
        request.input('points',sql.Int, parseInt(req.body.plan_points));
        request.input('price',sql.Decimal, parseFloat(req.body.plan_price));
        const query = `Insert into PrimePackagePlan(plan_name, plan_price, plan_featurs,plan_points)
                        values(@name,@price,@features,@points);`;
        request.query(query, (queryErr) => {
            if (!queryErr) 
            res.json({
                res: true,
                action : true
                });
            else {
                console.log(queryErr);
                res.json({
                    res: true,
                    action : false,
                    error_msg : "Internal Server Error"
                    });
            }    
        });
    } else if (req.params.mode == 'update') {
        request.input('plan_id', sql.NVarChar, req.body.plan_id);
        request.input('name',sql.NVarChar, req.body.plan_name);
        request.input('features',sql.NVarChar, req.body.plan_features);
        request.input('points',sql.Int, parseInt(req.body.plan_points));
        request.input('price',sql.Decimal, parseFloat(req.body.plan_price));
        const query = `Update PrimePackagePlan set plan_name=@name,plan_price=@price,plan_featurs=@features,plan_points=@points where plan_id=@plan_id`;
        request.query(query, (queryErr) => {
            if(queryErr) {
                res.json({res:true, action : true});
            } else {
                console.log(queryErr);
                res.json({res:true, action : false, error_msg : "Internal Server error"});
            }
        });
    } else if (req.params.mode == 'status') {
        request.input('plan_id', sql.NVarChar, req.body.plan_id);
        request.input('status', sql.Bit, parseInt(req.body.status));
        const query = `Update PrimePackagePlan set status=@status where plan_id=@plan_id;`;
        request.query(query, (queryErr) => {
            if (!queryErr)
            res.json({
                res: true,
                action : true
                });
            else {
                console.log(queryErr);
                res.json({res:true, action:false, error_msg : "Internal Server Error"})
            }

        });
    } else {
        res.json({res:false, error_msg : "Invalid Parameter Request"});
    }
});

router.post('/image/:upload_type',(req,res)=>{
    if (req.params.upload_type == 'single') {
      let formData = new Map();
      let bufs = [];
      req.busboy.on('field',(fieldName,fieldValue)=>{
        formData.set(fieldName,fieldValue);
      });
      req.busboy.on('file',(fileName, file, fileInfo, encoding,mimetype)=>{
        formData.set('fileType',mimetype);
        formData.set('fileName',fileInfo.name);
        file.on('data',(data)=>{
          if(data!=null)
            bufs.push(data);
        });
      });
      req.busboy.on('finish',()=>{
        const request = req.app.locals.db.request();
        request.input('data',sql.NVarChar, Buffer.concat(bufs).toString('hex'));
        request.input('image_mimetype', sql.VarChar, formData.fileType);
        request.input('name', sql.NVarChar, formData.fileName);
        const query = `DECLARE @InsertedRows TABLE (image_id varchar(15)); Insert into Images(image_name,img_mimetype,image_data) OUTPUT inserted.image_id INTO @InsertedRows values(@name,@image_mimetype,@data); Select image_id from @InsertedRows`;
        request.query(query, (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res:true, 
                    action : true,
                    image_id : result.recordset[0].image_id
                });
            } else {
                console.log(queryErr);
                res.json({
                    res : true,
                    action : false,
                    error_msg : "Internal Server Error"
                });
            }
        });
        
      });
      req.pipe(req.busboy);
  
    } else {
        res.json({res:false, error_msg : "Invalid Parameter request"});
    }
  });

router.get('/category',(req,res)=>{
    req.app.locals.db.query('select * from categories',(queryErr,result)=>{
        if(!queryErr) {
            res.json({
                res: true,
                categories : result.recordset
            });
        } else {
            res.json({ res : false, error_msg : 'Internal Server Error' });
        }
    })
});

router.post('/category',(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('name', sql.NVarChar, req.body.name);
    request.query('Insert Into categories(category_name) values(@name)', (queryErr,result)=>{
        if(queryErr) {
            res.json({res:true, action : false, errro_msg : 'Internal Server Error'});
            console.log(queryErr);
        } else {
            res.json({res:true, action : true});
        }
    });
});

module.exports = router;