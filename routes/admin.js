require('dotenv').config();
const csv = require('csv-parser');
const router = require('express').Router();
const busboy = require('busboy');
const bcrypt = require('bcrypt');

const sql = require('mssql');
const sqlConnect = require('../connections/sql-connect');
const {
    error
} = require('neo4j-driver');

router.post('/products/upload/:type', async (req, res) => {
    if (req.params.type == 'bulk') {
        try {

            const productSet = new Set();
            const getExistingProductName = await req.app.locals.db.query('Select product_name from products');
            getExistingProductName.recordset.map((product) => productSet.add(product.product_name));
            const productsArray = [];
            req.busboy.on('file', async (fieldName, file, fileName, encoding, mimetype) => {
                try {
                    // if (mimetype != 'text/csv') {
                    //     return res.json({
                    //         res: true,
                    //         action: false,
                    //         error_msg: "Invalid file type. Must be CSV"
                    //     });
                    // }

                    file.pipe(csv())
                        .on('data', async (data) => {
                            try {
                                productsArray.push(data);
                                // const request = req.app.locals.db.request();
                                // request.input('product_name', sql.NVarChar, data.name);
                                // request.input('category', sql.NVarChar, data.category_name)
                                // request.input('description', sql.NVarChar, data.description);
                                // request.input('sub_cat', sql.NVarChar, data.sub_category);
                                // request.input('product_tax', sql.Decimal, data.product_tax);
                                // request.input('img', sql.NVarChar, data.image_id);
                                // request.input('sale_price', sql.Decimal, data.sale_price);
                                // request.input('regular_price', sql.Decimal, data.regular_price);
                                // request.input('prime_price', sql.Decimal, data.prime_price);
                                // request.input('mqty', sql.Int, data.minimum_qty);
                                // request.input('item_stock', sql.Int, data.item_stock);
                                // request.input('ministore_bonus', sql.Decimal, data.ministore_bonus);
                                // request.input('weight', sql.NVarChar, data.weight);
                                // request.input('eligible',sql.Int, data.redeem_points);

                                // if (productMap.has(data.name)) {
                                //     console.log(`Skipped insertion for product: ${data.name}`);
                                //     const getProductIdQuery = `SELECT product_id FROM products WHERE product_name=@product_name`;
                                //     const productIdResult = await request.query(getProductIdQuery);
                                //     if (productIdResult.recordset.length > 0 ) {
                                //         const product_id = productIdResult.recordset[0].product_id;
                                //         request.input('product_id', sql.NVarChar, product_id);
                                //     }


                                // } else {
                                //     productMap.add(data.name);
                                //     const productInsertQuery = `
                                //       INSERT INTO products (product_name, category, product_description, product_tax, product_image_id, subcategory)

                                //       Select (@product_name, @category, @description, @product_tax, @img, @sub_cat)  WHERE NOT EXISTS (
                                //         SELECT 1
                                //         FROM products
                                //         WHERE product_name = @product_name
                                //       )
                                //     `;
                                //     request.query(productInsertQuery);


                                // }
                                // const itemQuery = `INSERT INTO items (sale_price, regular_price, prime_price, ministore_min_qty, ministore_product_bonus, item_weight, item_stock, product_id,eligiblity_to_redeem_discount_coupon) 
                                //                      VALUES (@sale_price, @regular_price, @prime_price, @mqty, @ministore_bonus, @weight, @item_stock,(select product_id from products where product_name=@product_name), @eligible);
                                //                 `;
                                //  request.query(itemQuery);
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
                res.status(500).json({
                    res: false,
                    action: false,
                    error_msg: 'Internal Server Error'
                });
                console.error(err);
            });
            req.busboy.on("finish", async () => {
                try {
                    
                    const table = new sql.Table('products');
                    table.create = false;
                    table.columns.add('product_name', sql.NVarChar(100), {
                        nullable: false
                    });
                    table.columns.add('category', sql.NVarChar(100), {
                        nullable: false
                    });
                    table.columns.add('product_description', sql.NVarChar(100), {
                        nullable: false
                    });
                    table.columns.add('product_tax', sql.Decimal(10, 2), {
                        nullable: false
                    });
                    table.columns.add('product_image_id', sql.NVarChar(100), {
                        nullable: false
                    });
                    table.columns.add('subcategory', sql.NVarChar(100), {
                        nullable: false
                    });
                    table.columns.add('is_mapped', sql.Bit, {
                        nullable: false
                    });
                    const itemsTable = new sql.Table('items');
                    itemsTable.create = false;
                    itemsTable.columns.add('sale_price', sql.Decimal(10, 2), {
                        nullable: false
                    });
                    itemsTable.columns.add('regular_price', sql.Decimal(10, 2), {
                        nullable: false
                    });
                    itemsTable.columns.add('prime_price', sql.Decimal(10, 2), {
                        nullable: false
                    });
                    itemsTable.columns.add('ministore_min_qty', sql.Int, {
                        nullable: false
                    });
                    itemsTable.columns.add('item_stock', sql.Int, {
                        nullable: false
                    });
                    itemsTable.columns.add('ministore_product_bonus', sql.Decimal(10, 2), {
                        nullable: false
                    });
                    itemsTable.columns.add('item_weight', sql.NVarChar(100), {
                        nullable: false
                    });
                    itemsTable.columns.add('eligiblity_to_redeem_discount_coupon', sql.Int, {
                        nullable: false
                    });
                    itemsTable.columns.add('item_product_name', sql.NVarChar(200), {
                        nullable: false
                    });
                    productsArray.forEach(row => {
                        if (!productSet.has(row.name)) {
                            table.rows.add(
                                row.name,
                                row.category_name,
                                row.description,
                                row.sub_category,
                                row.product_tax,
                                data.image_id
                            );
                        }
                        productSet.add(row.name);
                        itemsTable.rows.add(
                            parseFloat(row.sale_price),
                            parseFloat(row.regular_price),
                            parseFloat(row.prime_price),
                            parseInt(row.minimum_qty),
                            parseInt(row.item_stock),
                            parseFloat(row.ministore_bonus),
                            row.item_weight,
                            parseInt(row.redeem_points),
                            row.name
                        );
                    });
                    const connection = await sqlConnect();
                    const request =  new sql.Request(connection);
                    // await request.bulk(table);
                    // await request.bulk(itemsTable);
                    res.json({
                        res: true,
                        action: true,
                        msg: 'Items Uploaded Successfully'
                    });
                } catch (err) {
                    
                    console.log(error);
                    res.status(500).json({
                        res: false,
                        action: false,
                        error_msg: 'Internal Server Error'
                    });
                }
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
        let formData = new FormData();
        req.busboy.on('field', (fieldName, fieldValue) => {
            formData.append(fieldName, fieldValue);
        });
        req.busboy.on('finish', async () => {
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, formData.get('name'));
            request.input('category', sql.NVarChar, formData.get('category_name'));
            request.input('sub_cat', sql.NVarChar, formData.get('sub_category'));
            request.input('description', sql.NVarChar, formData.get('description'));
            request.input('product_tax', sql.Decimal, formData.get('product_tax'));
            request.input('img', sql.NVarChar, formData.get('image_id'));
            const productQuery2 = `Insert Into products(product_name,category,product_description,product_tax,product_image_id,subcategory)
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
                        error_msg: 'Internal Server Error'
                    });
                }
            });

        });
    } else if (req.params.type == 'item_new') {


        const request = req.app.locals.db.request();
        request.input('sale_price', sql.Decimal, req.body.sale_price);
        request.input('regular_price', sql.Decimal, req.body.regular_price);
        request.input('prime_price', sql.Decimal, req.body.prime_price);
        request.input('product_id', sql.NVarChar, req.body.product_id);
        request.input('mqty', sql.Int, req.body.ministore_min_qty);
        request.input('item_stock', sql.Int, req.body.item_stock);
        request.input('ministore_bonus', sql.Decimal, req.body.ministore_product_bonus);
        request.input('weight', sql.NVarChar, req.body.item_weight);
        request.input('discount_points', sql.Int, parseInt(req.body.discount_points));
        const itemQuery = `Insert into items(sale_price,regular_price,prime_price,ministore_min_qty,ministore_product_bonus,item_weight,item_stock,product_id,eligiblity_to_redeem_discount_coupon) 
                                                   values(@sale_price,@regular_price,@prime_price,@mqty,@ministore_bonus,@weight,@item_stock,@product_id,@discount_points)`;
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
    } else if (req.params.type == 'item_update') {



        console.log(req.body.item_id)
        const request = req.app.locals.db.request();
        request.input('sale_price', sql.Decimal, req.body.sale_price);
        request.input('regular_price', sql.Decimal, req.body.regular_price);
        request.input('prime_price', sql.Decimal, req.body.prime_price);
        request.input('item_id', sql.NVarChar, req.body.item_id);
        request.input('mqty', sql.Int, req.body.ministore_min_qty);
        request.input('item_stock', sql.Int, req.body.item_stock);
        request.input('ministore_bonus', sql.Decimal, req.body.ministore_product_bonus);
        request.input('weight', sql.NVarChar, req.body.item_weight);
        request.input('discount_points', sql.Int, req.body.discount_points);
        const itemQuery = `Update items set sale_price=@sale_price, regular_price=@regular_price, prime_price=@prime_price, ministore_min_qty=@mqty, ministore_product_bonus=@ministore_bonus, item_weight=@weight,item_stock=@item_stock eligiblity_to_redeem_discount_coupon=@discount_points where item_id=@item_id`;
        request.query(itemQuery, (queryErr, result) => {

            if (!queryErr && result.rowsAffected[0] == 1) {
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

    } else if (req.params.type == 'product_update') {
        const request = req.app.locals.db.request();
        request.input('name', sql.NVarChar, req.body.product_name);
        request.input('id', sql.NVarChar, req.body.product_id);
        request.input('cat', sql.NVarChar, req.body.product_category);
        request.input('subcat', sql.NVarChar, req.body.subcategory);
        request.input('img', sql.NVarChar, req.body.product_image_id);
        request.input('des', sql.NVarChar, req.body.product_description);
        const updateQuery = 'update products set product_name=@name,product_image_id=@img, product_description=@des  where product_id=@id';
        request.query(updateQuery, (queryErr, result) => {
            if (!queryErr && result.rowsAffected[0] == 1) {
                res.json({
                    res: true,
                    action: true
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false
                });
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
        const productQuery = `select p.id,p.product_id,p.product_name,p.product_status,p.product_description ,c.category_name, p.product_image_id,img.image_data, itm.item_id,itm.sale_price,itm.regular_price,itm.prime_price,itm.item_stock,itm.eligiblity_to_redeem_discount_coupon,itm.ministore_min_qty, itm.ministore_product_bonus, itm.item_weight,sc.sub_category_name from products as p join items as itm on p.product_id=itm.product_id join categories as c on p.category=c.category_id join Images as img on p.product_image_id=img.image_id join Sub_Category as sc on p.subcategory=sc.sub_category_id  where p.product_id=@product_id;`;
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
        request.query('select o.order_id, o.total_amount, o.payment_mode, o.payment_status, o.order_status, o.user_id,o.ordered_month,o.ordered_year,o.addr_id,a.addr_first_line,a.addr_second_line,a.addr_city, a.addr_pincode, a.addr_state, a.addr_phone, a.addr_name, itm.item_id, oitm.quantity, itm.item_weight   from Orders as o join OrderItems as oitm on o.order_id=oitm.order_id join AddressBook as a on o.addr_id=a.addr_id join items as itm on oitm.item_id=itm.item_id where o.order_id=@order_id', (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    order: result.recordset
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false
                });
            }
        });
    } else {
        res.json({
            res: false,
            error_msg: "Invalid parameter request"
        });
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
        query = "select * from PrimeUsers as p join PrimeUsersWallet as w on p.user_id=w.prime_user_id"
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

router.get('/plan/:mode', (req, res) => {
    const request = req.app.locals.db.request();
    if (req.params.mode == 'get_all') {
        request.query('select * from PrimePackagePlan', (queryErr, result) => {
            if (!queryErr)
                res.json({
                    res: true,
                    plans: result.recordset
                });
            else {
                console.log(queryErr);
                res.json({
                    res: false,
                    error_msg: "Internal Server Error"
                });
            }
        });
    } else if (req.params.mode == 'get_one') {
        request.input('plan_id', sql.NVarChar, req.query.plan_id);
        request.query('select * from PrimePackagePlan where plan_id=@plan_id', (queryErr, result) => {
            if (!queryErr) {
                res.json({
                    res: true,
                    plans: result.recordset
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false,
                    error_msg: 'Internal Server Error'
                });
            }
        });
    } else {
        res.json({
            res: false,
            error_msg: "Invalid Parameter Request"
        });
    }
});

router.post('/plan/:mode', (req, res) => {
    const request = req.app.locals.db.request();
    if (req.params.mode == 'add') {
        request.input('name', sql.NVarChar, req.body.plan_name);
        request.input('features', sql.NVarChar, req.body.plan_features);
        request.input('image', sql.NVarChar, req.body.image);
        request.input('points', sql.Int, parseInt(req.body.plan_points));
        request.input('price', sql.Decimal, parseFloat(req.body.plan_price));
        const query = `Insert into PrimePackagePlan(plan_name, plan_price, plan_features,plan_points,plan_image)
                        values(@name,@price,@features,@points,@image);`;
        request.query(query, (queryErr) => {
            if (!queryErr)
                res.json({
                    res: true,
                    action: true
                });
            else {
                console.log(queryErr);
                res.json({
                    res: true,
                    action: false,
                    error_msg: "Internal Server Error"
                });
            }
        });
    } else if (req.params.mode == 'update') {
        request.input('plan_id', sql.NVarChar, req.body.plan_id);
        request.input('name', sql.NVarChar, req.body.plan_name);
        request.input('features', sql.NVarChar, req.body.plan_features);
        request.input('image', sql.NVarChar, req.body.image);
        request.input('points', sql.Int, parseInt(req.body.plan_points));
        request.input('price', sql.Decimal, parseFloat(req.body.plan_price));
        const query = `Update PrimePackagePlan set plan_name=@name,plan_price=@price,plan_featues=@features,plan_points=@points, plan_image=@image where plan_id=@plan_id`;

        request.query(query, (queryErr) => {
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
                    error_msg: "Internal Server error"
                });
            }
        });
    } else if (req.params.mode == 'status') {
        request.input('plan_id', sql.NVarChar, req.body.plan_id);
        request.input('status', sql.Bit, parseInt(req.body.status));
        const query = `Update PrimePackagePlan set plan_status=@status where plan_id=@plan_id;`;
        request.query(query, (queryErr) => {
            if (!queryErr)
                res.json({
                    res: true,
                    action: true
                });
            else {
                console.log(queryErr);
                res.json({
                    res: true,
                    action: false,
                    error_msg: "Internal Server Error"
                })
            }

        });
    } else {
        res.json({
            res: false,
            error_msg: "Invalid Parameter Request"
        });
    }
});

router.post('/image/:upload_type', (req, res) => {
    if (req.params.upload_type == 'single') {
        let formData = new Map();
        let bufs = [];
        req.busboy.on('field', (fieldName, fieldValue) => {
            formData.set(fieldName, fieldValue);
        });
        req.busboy.on('file', (fileName, file, fileInfo, encoding, mimetype) => {
            formData.set('fileType', mimetype);
            formData.set('fileName', fileInfo.name);
            file.on('data', (data) => {
                if (data != null)
                    bufs.push(data);
            });
        });
        req.busboy.on('finish', () => {
            const request = req.app.locals.db.request();
            request.input('data', sql.NVarChar, Buffer.concat(bufs).toString('hex'));
            request.input('image_mimetype', sql.VarChar, formData.fileType);
            request.input('name', sql.NVarChar, formData.fileName);
            const query = `DECLARE @InsertedRows TABLE (image_id varchar(15)); Insert into Images(image_name,img_mimetype,image_data) OUTPUT inserted.image_id INTO @InsertedRows values(@name,@image_mimetype,@data); Select image_id from @InsertedRows`;
            request.query(query, (queryErr, result) => {
                if (!queryErr) {
                    res.json({
                        res: true,
                        action: true,
                        image_id: result.recordset[0].image_id
                    });
                } else {
                    console.log(queryErr);
                    res.json({
                        res: true,
                        action: false,
                        error_msg: "Internal Server Error"
                    });
                }
            });

        });
        req.pipe(req.busboy);

    } else {
        res.json({
            res: false,
            error_msg: "Invalid Parameter request"
        });
    }
});

router.get('/category', (req, res) => {
    req.app.locals.db.query('select * from categories', (queryErr, result) => {
        if (!queryErr) {
            res.json({
                res: true,
                categories: result.recordset
            });
        } else {
            res.json({
                res: false,
                error_msg: 'Internal Server Error'
            });
        }
    })
});

router.post('/category', (req, res) => {
    const request = req.app.locals.db.request();
    request.input('name', sql.NVarChar, req.body.name);
    request.input('image', sql.NVarChar, req.body.image);
    request.query('Insert Into categories(category_name,category_image) values(@name,@image)', (queryErr, result) => {
        if (queryErr) {
            res.json({
                res: true,
                action: false,
                errro_msg: 'Internal Server Error'
            });
            console.log(queryErr);
        } else {
            res.json({
                res: true,
                action: true
            });
        }
    });
});


function generateSubQueryOnFrequency(interval, tableName, date = null, month = null, year = null) {
    let subquery = '';
    switch (interval) {
        case 'daily':
            subquery = `
            SELECT CAST(created_at as DATE) as full_date,
            id
            FROM
            ${tableName}
            WHERE 
            CAST(created_at as DATE) = '${date}'
           
            `;
            break;
        case 'month':
            subquery = `
            
            SELECT CAST(created_at as DATE) as full_date,
            DATEPART(YEAR, created_at) AS year,
            DATEPART(MONTH, created_at) AS month,
            id
            FROM 
            ${tableName}
            WHERE
            DATEPART(YEAR, created_at) = '${year}' and
            DATEPART(MONTH, created_at) = '${month}'
            `;
            break;
        case 'year':
            subquery = `
            
            SELECT CAST(created_at as DATE) as full_date,
            DATEPART(YEAR, created_at) AS year,
            DATEPART(MONTH, created_at) AS month,
            id
            FROM 
            ${tableName}
            WHERE
            DATEPART(YEAR, created_at) = '${year}'
            `
            break;
        case 'custom':
            subquery = `
            SELECT CAST(created_at as DATE) as full_date,
            DATEPART(YEAR, created_at) AS year,
            DATEPART(MONTH, created_at) AS month,
            id
            FROM 
            ${tableName}
            WHERE
            CAST(created_at as DATE) BETWEEN '${date.from}' and '${date.to}'
            `
            break;
    }
    return subquery != '' ? {
        response: true,
        query: subquery
    } : {
        response: false
    };
}

router.post('/reports/:type', async (req, res) => {
    if (req.params.type == 'orders') {
        try {
            let response;
            if (req.body.frequency == 'daily') {
                response = generateSubQueryOnFrequency('daily', 'Orders', req.body.date, null, null);
            } else if (req.body.frequency == 'month') {
                response = generateSubQueryOnFrequency('month', 'Orders', null, req.body.month, req.body.year);
            } else if (req.body.frequency == 'year') {
                response = generateSubQueryOnFrequency('year', 'Orders', null, null, req.body.year);
            } else if (req.body.frequency == 'custom') {
                response = generateSubQueryOnFrequency('custom', 'Orders', {
                    from: req.body.from_date,
                    to: req.body.to_date
                });
            } else {
                throw new Error('Invalid Frequency');
            }
            if (!response.response) {
                throw new Error('Invalid Body Frequency');
            }
            const conditionQuery = req.body.type === 'all' ? '' : `where o.order_status='${req.body.type}'`;
            const mainQuery = `
            SELECT 
            o.order_id, 
            o.ordered_month,
            o.ordered_year,
            subquery.full_date,
            o.user_id,
            o.total_amount,
            o.payment_status,
            o.payment_mode,
            o.order_status,
            o.addr_id,
            a.addr_first_line,a.addr_second_line,a.addr_city, a.addr_pincode, a.addr_state, a.addr_phone, a.addr_name
            FROM Orders as o 
            INNER JOIN
            (${response.query}) as subquery on o.id=subquery.id
            JOIN 
            AddressBook AS a ON o.addr_id=a.addr_id ${conditionQuery}
            `
            const result = await req.app.locals.db.query(mainQuery);
            if (result.recordset.length > 0)
                res.json({
                    res: true,
                    csv: result.recordset
                });
            else
                throw new Error('No Records Found');
        } catch (err) {

            res.json({
                res: false,
                error_msg: err.message
            });
        }

    } else if (req.params.type == 'products') {
        try {
            let response;
            if (req.body.type == undefined)
                throw new Error('Invalid Type Request');
            let query;

            if (req.body.type == 'low_stock')
                query = `Select * from items as itm join products as p on itm.product_id=p.product_id where itm.item_stock<20`;
            else if (req.body.type == 'products')
                query = `select distinct p.id,p.product_id,p.product_status,p.product_name,p.category,p.subcategory,Cast(p.created_at as DATE) as created_at,(select count(item_id) from items where product_id=p.product_id group by product_id) as item_count from products as p`
            else if (req.body.type == 'pitems')
                query = `select itm.item_id, itm.sale_price, itm  from items as itm join products as p on itm.product_id=p.product_id`;
            else
                throw new Error('Invalid Type Request');
            const result = await req.app.locals.db.query(query);
            if (result.recordset.length > 0)
                res.json({
                    res: true,
                    csv: result.recordset
                });
            else
                throw new Error('No Records Found');
        } catch (err) {

            res.json({
                res: false,
                error_msg: err.message
            });
        }
    } else if (req.params.type == 'wallet') {
        try {
            let response;
            if (req.body.frequency == 'daily') {
                response = generateSubQueryOnFrequency('daily', 'WalletTransaction', req.body.date, null, null);
            } else if (req.body.frequency == 'month') {
                response = generateSubQueryOnFrequency('month', 'WalletTransaction', null, req.body.month, req.body.year);
            } else if (req.body.frequency == 'year') {
                response = generateSubQueryOnFrequency('year', 'WalletTransaction', null, null, req.body.year);
            } else if (req.body.frequency == 'custom') {
                response = generateSubQueryOnFrequency('custom', 'WalletTransaction', {
                    from: req.body.from_date,
                    to: req.body.to_date
                });
            } else {
                throw new Error('Invalid Frequency');
            }
            if (!response.response) {
                throw new Error('Invalid Body Frequency');
            }
            const conditionQuery = req.body.type == 'all' ? '' : `where w.transaction_status='${req.body.type}'`;
            const mainQuery = `
            SELECT
            * 
            FROM
            WalletTransaction as w 
            INNER JOIN 
            (${response.query}) as subquery 
            on 
            subquery.id=w.id
            ${conditionQuery} 
            `
            const result = await req.app.locals.db.query(mainQuery);
            if (result.recordset.length > 0)
                res.json({
                    res: true,
                    csv: result.recordset
                });
            else
                throw new Error('No Records Found');
        } catch (err) {

            res.json({
                res: false,
                error_msg: err.message
            });
        }
    } else if (req.params.type == 'withdraw') {
        try {
            let response;
            if (req.body.frequency == 'daily') {
                response = generateSubQueryOnFrequency('daily', 'WithdrawalRequests', req.body.date, null, null);
            } else if (req.body.frequency == 'month') {
                response = generateSubQueryOnFrequency('month', 'WithdrawalRequests', null, req.body.month, req.body.year);
            } else if (req.body.frequency == 'year') {
                response = generateSubQueryOnFrequency('year', 'WithdrawalRequests', null, null, req.body.year);
            } else if (req.body.frequency == 'custom') {
                response = generateSubQueryOnFrequency('custom', 'WithdrawalRequests', {
                    from: req.body.from_date,
                    to: req.body.to_date
                });
            } else {
                throw new Error('Invalid Frequency');
            }
            if (!response.response) {
                throw new Error('Invalid Body Frequency');
            }
            const conditionQuery = req.body.type == 'all' ? '' : `where w.withdraw_status='${req.body.type}'`;
            const mainQuery = `
        SELECT 
        *
        FROM WithdrawalRequests as w 
        INNER JOIN 
        (${response.query}) as subquery 
        on
        subquery.id=w.id
        ${conditionQuery} 
        `;
            const result = await req.app.locals.db.query(mainQuery);
            if (result.recordset.length > 0)
                res.json({
                    res: true,
                    csv: result.recordset
                });
            else
                throw new Error('No Records Found');
        } catch (err) {

            res.json({
                res: false,
                error_msg: err.message
            });
        }

    } else if (req.params.type == 'transactions') {

    } else {
        res.json({
            res: false,
            error_msg: 'Invalid Request'
        });
    }
});


// async function generateReports() {
//     try {
//       await sql.connect(config);

//       // Overall orders report
//       const overallOrdersResult = await sql.query(`
//         SELECT COUNT(*) AS TotalOrders
//         FROM Orders
//       `);
//       const overallOrders = overallOrdersResult.recordset[0].TotalOrders;

//       // Orders completed report
//       const ordersCompletedResult = await sql.query(`
//         SELECT COUNT(*) AS CompletedOrders
//         FROM Orders
//         WHERE order_status = 'Completed'
//       `);
//       const ordersCompleted = ordersCompletedResult.recordset[0].CompletedOrders;

//       // Orders pending report
//       const ordersPendingResult = await sql.query(`
//         SELECT COUNT(*) AS PendingOrders
//         FROM Orders
//         WHERE order_status = 'Pending'
//       `);
//       const ordersPending = ordersPendingResult.recordset[0].PendingOrders;

//       console.log('Overall Orders:', overallOrders);
//       console.log('Orders Completed:', ordersCompleted);
//       console.log('Orders Pending:', ordersPending);

//       // Daily orders report
//       const dailyOrdersResult = await sql.query(`
//         SELECT CONVERT(DATE, GETDATE()) AS Date,
//                COUNT(*) AS TotalOrders
//         FROM Orders
//         WHERE CONVERT(DATE, created_at) = CONVERT(DATE, GETDATE())
//         GROUP BY CONVERT(DATE, GETDATE())
//       `);
//       const dailyOrders = dailyOrdersResult.recordset;

//       console.log('Daily Orders:', dailyOrders);

//       // Weekly orders report
//       const weeklyOrdersResult = await sql.query(`
//         SELECT DATEPART(ISO_WEEK, created_at) AS WeekNumber,
//                COUNT(*) AS TotalOrders
//         FROM Orders
//         WHERE DATEPART(ISO_WEEK, created_at) = DATEPART(ISO_WEEK, GETDATE())
//         GROUP BY DATEPART(ISO_WEEK, created_at)
//       `);
//       const weeklyOrders = weeklyOrdersResult.recordset;

//       console.log('Weekly Orders:', weeklyOrders);

//       // Monthly orders report
//       const monthlyOrdersResult = await sql.query(`
//         SELECT MONTH(created_at) AS MonthNumber,
//                COUNT(*) AS TotalOrders
//         FROM Orders
//         WHERE MONTH(created_at) = MONTH(GETDATE())
//         GROUP BY MONTH(created_at)
//       `);
//       const monthlyOrders = monthlyOrdersResult.recordset;

//       console.log('Monthly Orders:', monthlyOrders);

//       // Yearly orders report
//       const yearlyOrdersResult = await sql.query(`
//         SELECT YEAR(created_at) AS YearNumber,
//                COUNT(*) AS TotalOrders
//         FROM Orders
//         WHERE YEAR(created_at) = YEAR(GETDATE())
//         GROUP BY YEAR(created_at)
//       `);
//       const yearlyOrders = yearlyOrdersResult.recordset;

//       console.log('Yearly Orders:', yearlyOrders);
//     } catch (err) {
//       console.error('Error:', err);
//     } finally {
//       sql.close();
//     }
//   }

router.get('/contacts', async (req, res) => {
    if (req.query.type == 'enquiry') {
        try {
            const request = req.app.locals.db.request();

            const getDairyQuery = 'Select * from PrimeUsersEnquiry';
            const result = await request.query(getDairyQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in getting enquiry request", err);
            res.json({
                res: false,
                error_msg: 'Error in getting enquiry request'
            })
        }
    } else if (req.query.type == 'support') {
        try {
            const request = req.app.locals.db.request();
            const getDairyQuery = 'Select * from SupportTable;';
            const result = await request.query(getDairyQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in getting support request", err);
            res.json({
                res: false,
                error_msg: 'Error in getting enquiry request'
            })
        }
    } else if (req.query.type == 'dairy') {
        try {
            const request = req.app.locals.db.request();
            const getDairyQuery = 'Select * from MLMDairy;';
            const result = await request.query(getDairyQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in getting dairy", err);
            res.json({
                res: false,
                error_msg: 'Error in getting dairy'
            })
        }

    }
});

router.get('/wallet', async (req, res) => {
    if (req.query.type == 'wallet') {
        try {
            const request = req.app.locals.db.request();

            const getDairyQuery = 'Select * from WalletTransaction order by created_at desc';
            const result = await request.query(getDairyQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in wallet", err);
            res.json({
                res: false,
                error_msg: 'Error in wallet'
            })
        }
    } else if (req.query.type == 'withdraw') {
        try {
            const request = req.app.locals.db.request();

            const getDairyQuery = 'Select * from WithdrawalRequests order by created_at desc';
            const result = await request.query(getDairyQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in withdrawal", err);
            res.json({
                res: false,
                error_msg: 'Error in withdrawal request'
            })
        }
    } else if (req.query.type == 'points') {
        try {
            const request = req.app.locals.db.request();
            const getDataQuery = 'Select * from PointsToWallet as p join PrimeUsers as u on p.user_id=u.user_id';
            const result = await request.query(getDataQuery);
            res.json({
                res: true,
                members: result.recordset
            });
        } catch (err) {
            console.log("Error in withdrawal", err);
            res.json({
                res: false,
                error_msg: 'Error in Points To Wallet request'
            })
        }
    } else {
        res.json({
            res: false,
            error_msg: "Invalid Query Request"
        })
    }
});

router.get('/master/get_all', async (req, res) => {
    try {
        const request = req.app.locals.db.request();

        const getDairyQuery = 'Select id,master_id,master_name,master_type,created_at,master_status from MasterUsers order by created_at desc';
        const result = await request.query(getDairyQuery);
        res.json({
            res: true,
            members: result.recordset
        });
    } catch (err) {
        console.log("Error in wallet", err);
        res.json({
            res: false,
            error_msg: 'Error in wallet'
        })
    }
});

router.post('/master/:mode', async (req, res) => {
    if (req.params.mode == 'new') {
        try {
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, req.body.name);
            request.input('type', sql.NVarChar, req.body.type);
            request.input('password', sql.NVarChar, req.body.password)
            const getDairyQuery = 'INSERT INTO MasterUsers(master_name,master_type,master_password) values (@name,@type,@password);';
            const result = await request.query(getDairyQuery);

            res.json({
                res: true,
                action: true
            });
        } catch (err) {
            console.log("Error in MasterUsers New", err);
            res.json({
                res: false,
                error_msg: 'Internal server error'
            })
        }
    } else if (req.params.mode == 'update') {
        try {
            const request = req.app.locals.db.request();
            request.input('id', sql.NVarChar, req.body.master_id)
            request.input('name', sql.NVarChar, req.body.name);
            request.input('type', sql.NVarChar, req.body.type);
            request.input('password', sql.NVarChar, req.body.password)
            const getDairyQuery = 'update  MasterUsers set master_name=@name, master_type=@type,master_password=@password where master_id=@id';
            const result = await request.query(getDairyQuery);

            res.json({
                res: true,
                action: true
            });
        } catch (err) {
            console.log("Error in MasterUsers Update", err);
            res.json({
                res: false,
                error_msg: 'Internal Server Error'
            })
        }
    } else if (req.params.mode = 'status') {
        try {
            const request = req.app.locals.db.request();
            request.input('id', sql.NVarChar, req.body.master_id);
            request.input('status', sql.Bit, parseInt(req.body.status))
            const getDairyQuery = 'Update MasterUsers set master_status=@status  where master_id=@id;';
            const result = await request.query(getDairyQuery);

            res.json({
                res: true,
                action: true
            });
        } catch (err) {
            console.log("Error in MasterUsers Status", err);
            res.json({
                res: false,
                error_msg: 'Internal Server Error'
            })
        }
    } else {
        res.json({
            res: false,
            error_msg: 'Invalid Params'
        })
    }
})

router.post('/tree/add', (req, res) => {
    function updateReferralPoints(memberID, parentID) {
        // Update the referral points for the parent
        const request = req.app.locals.db.request();
        request.input('member_id', sql.NVarChar, memberID);
        request.input('parent_id', sql.NVarChar, parentID);
        const query = ``
        `SET NOCOUNT ON;
        DECLARE @NewMemberID NVARCHAR(50) = @member_id;
        DECLARE @NewMemberParentID NVARCHAR(50) = @parent_id;
        DECLARE @AncestorID NVARCHAR(50) = @NewMemberParentID;
        DECLARE @TempMemberID NVARCHAR(50) = @NewMemberID;
        DECLARE @ReferralPoints INT = (select p.plan_points from PrimePackagePlan as p join PrimeUsers as users on p.plan_id=users.prime_plan_id where users.user_id=@NewMemberID);
        UPDATE MLM
        SET MLM.HasAnyChildReferred=CASE WHEN MLM.LeftChildID=@NewMemberParentID OR MLM.RightChildID=@NewMemberParentID THEN 1 ELSE MLM.HasAnyChildReferred END
        FROM BinaryTreeMLM AS MLM 
        JOIN PrimeUsers as PU ON MLM.MemberID=PU.user_id
        WHERE MLM.MemberID=(Select ParentID FROM BinaryTreeMLM WHERE MemberID = @NewMemberParentID);
        -- Update Referral points for all users
        WHILE @AncestorID is not NULL
        BEGIN 
            UPDATE BinaryTreeMLM
            SET 
            LeftReferralPoints = CASE WHEN LeftChildID=@TempMemberID THEN LeftReferralPoints+@ReferralPoints ELSE LeftReferralPoints END,
            RightReferralPoints = CASE WHEN RightChildID=@TempMemberID  THEN RightReferralPoints+@ReferralPoints ELSE RightReferralPoints END,
            TotalReferralPoints = CASE WHEN LeftChildID=@TempMemberID or RightChildID=@TempMemberID  THEN TotalReferralPoints+@ReferralPoints ELSE TotalReferralPoints END
            WHERE MemberID=@AncestorID;
            SET @TempMemberID = @AncestorID;
            SET @AncestorID=(Select ParentID from BinaryTreeMLM where MemberID=@AncestorID);
        END`
        ``;
        request.query(query);
    }
    console.log(req.body);
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
            console.log(err);
            res.json({
                res: false
            });
        } else {
            const now = new Date();

            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentYear = now.getFullYear().toString().slice(-2);
            const currentDate = (now.getDate()).toString();
            console.log(currentDate);
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, req.body.name);
            request.input('password', sql.NVarChar, hash);
            request.input('year', sql.NChar, currentYear);
            request.input('month', sql.NChar, currentMonth);
            request.input('date', sql.NChar, currentDate);
            request.input('type', sql.VarChar, req.body.userType);
            request.input('parentID', sql.NVarChar, req.body.parentID);
            request.input('position', sql.NChar, req.body.position);
            request.input('plan_id', sql.NVarChar, req.body.planID);
            request.input('is_active', sql.Bit, 1);
            request.input('sponsor_id', sql.VarChar, 'ADMIN');
            request.input('dob', sql.NVarChar, req.body.dob);
            request.input('panNo', sql.NVarChar, req.body.panNo);
            request.input('adhaarNo', sql.NVarChar, req.body.aadharNo);
            request.input('address', sql.NVarChar, req.body.address);
            request.input('guardianName', sql.NVarChar, req.body.nomineName);
            request.input('district', sql.NVarChar, req.body.district);
            request.input('pinCode', sql.NVarChar, req.body.pincode);
            request.input('state', sql.NVarChar, req.body.state);
            request.input('email', sql.NVarChar, req.body.email);
            request.input('nearestCity', sql.NVarChar, req.body.nearestCity);
            request.input('mobileno', sql.NVarChar, req.body.phone);
            request.input('gender', sql.NVarChar, req.body.gender);
            const insertQuery = `
            DECLARE @flag bit ;
            SET @flag = 0;
            IF @position='L' and (Select LeftChildID from BinaryTreeMLM where MemberID=@parentID) is not null 
            BEGIN 
            SET @flag=1; 
            END 
            IF @position='R' and (select RightChildID from BinaryTreeMLM where MemberID=@parentID) is not null 
            BEGIN 
            SET @flag = 1; 
            END  
            IF @flag=0 
            BEGIN 
            Insert into PrimeUsers(
                user_name,
                user_parent_id,
                registered_month,
                registered_year,
                registered_date,
                user_type,
                user_password,
                user_position,
                user_status,
                user_sponsor_id,
                prime_plan_id,
                user_dob,
                user_pan_no,
                user_aadhar_no,
                user_address,
                user_guardian_name,
                user_mobile_number,
                user_email,
                user_state,
                user_district,
                user_pincode,
                user_gender,
                user_nearest_city
                ) 
            values (
                @name,
                @parentID,
                @month,
                @year,
                @date,
                @type,
                @password,
                @position,
                @is_active,
                @sponsor_id,
                @plan_id,
                @dob,
                @panNo,
                @adhaarNo,
                @address,
                @guardianName,
                @mobileno,
                @email,
                @state,
                @district,
                @pinCode,
                @gender,
                @nearestCity
                );
            END
            
            `

            request.query(insertQuery, (queryErr, result) => {
                if (!queryErr) {

                    res.json({
                        res: true,
                        action: true
                    });
                } else {
                    console.log(queryErr);
                    res.json({
                        res: false,
                        action: false
                    });
                }
            });
        }
    });

});

router.get('/mlmactions', (req, res) => {
    const request = req.app.locals.db.request();
    request.query('Select TOP 1 * from points_table', (queryErr, result) => {
        if (!queryErr) {
            res.json({
                res: true,
                data: result.recordset[0]
            })
        } else {
            res.json({
                res: false
            });
            console.log(queryErr);
        }
    });
});

router.post('/mlmactions', (req, res) => {
    try {
        const request = req.app.locals.db.request();
        request.input('value', sql.Decimal, parseFloat(req.body.point_value));
        request.input('period', sql.Int, parseInt(req.body.period));
        request.input('pv_limit', sql.Decimal, parseFloat(req.body.pv_limit));
        request.input('withdraw_limit', sql.Decimal, parseFloat(req.body.withdraw_limit));
        request.input('point_share', sql.Decimal(10, 2), parseFloat(req.body.point_share));


        const insertQuery = 'Update points_table set point_value=@value, ceiling_pv=@pv_limit, ceiling_amount=@withdraw_limit, referral_period=@period, upline_points=@point_share';
        request.query(insertQuery, (queryErr) => {
            if (!queryErr) {
                res.json({
                    res: true
                });
            } else {
                console.log(queryErr);
                res.json({
                    res: false,
                    error_msg: 'Internal Server Error'
                });
            }
        })
    } catch (err) {
        console.log(err);
        res.json({
            res: false,
            error_msg: 'Internal Server Error'
        });
    }
});

router.get('/pointstowallet', async (req, res) => {
    try {
        const request = req.app.locals.db.request();
        const run1 = await request.query(' EXEC UplineToDownLinePointsTransfer');
        const run2 = await request.query(' EXEC weeklyMLMCalculations');
        res.json({
            res: true
        });
    } catch (err) {
        console.log(err);
        res.json({
            res: false
        });
    }
});

module.exports = router;