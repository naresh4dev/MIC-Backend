const fs = require('fs');
const csv = require('csv-parser');
const sql = require('mssql');
const router = require('express').Router();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWrite = createCsvWriter({
    path: 'product_list_segregated.csv',
});

function getRandomPrice() {
    const random_price = Math.floor(Math.random() * (300 - 50 + 1) + 50);
    const sale_price = random_price - (random_price * 5 / 100);
    const ministore = random_price - (random_price * 15 / 100);
    const ministore_bonus = Math.floor(Math.random() * (30 - 2 + 1) + 50);
    return {
        price: random_price,
        sale_pri  ce: sale_price,
        ministore: ministore,
        bonus : ministore_bonus
    };
}


router.get('/update', (req, res) => {
    let product_name='';
    let category;
    let product_id
    let newfirst = true;
    let first = true;
    let img, flag = false;
    let count = 1;
    fs.createReadStream('/Users/naresh_dev/Developments/MIC-Backend/routes/product_lists.csv')
        .pipe(csv())
        .on('data', (data) => {
          
            if (first) {
                category = data.Categories;
                product_name = data.name;
                img = data.Images;
                first = false;
            } else {
                if (data.Categories === '' && data.Images === '') {

                    data.Categories = category;

                } else if (data.Categories != category && data.Images != img) {
                    category = data.Categories;
                }
                if (data.Images === '') {
                    data.Images = img;
                    flag = true;
                } else if (data.Images != img) {
                    img = data.Images;
                    flag = false;
                }
            }
            if (data.ID != undefined && data.Categories != undefined && flag) {
                const price = getRandomPrice();
                // if(data.Categories == "Dals & Pulses"){
                //   data.Categories="C001";
                // } else if (data.Categories == "Dried Fruits-Nuts & Seeds") {
                //   data.Categories="C002";
                // } else if (data.Categories == "Masalas & Spices") {
                //   data.Categories="C003";
                // } else if (data.Categories == "Millets") {
                //   data.Categories="C004";
                // } else if (data.Categories == "Salt-Sugar and Jaggery") {
                //   data.Categories="C005";
                 count+=1;
                insertDataToDB(data.Name, data.Categories, price.price, price.sale_price, price.ministore,data.weight, data.Images,price.bonus);
            }

            console.log(data.ID, );

        }).on('end', () => {
            console.log('Successfully read');
        });
    async function insertDataToDB(name, cat, rp, sp, mp, weight, images,bonus) {
        const request = req.app.locals.db.request();
        request.input('name', sql.NVarChar, name);
        request.input('cat', sql.NVarChar, cat);
        request.input('rp', sql.Decimal, rp);
        request.input('sp', sql.Decimal, sp);
        request.input('mp', sql.Decimal, mp);
        request.input('bonus', sql.Decimal, bonus);
        request.input('tax', sql.Int, 5);
        request.input('min', sql.Int, 30);
        request.input('stock', sql.Int, 150);
        request.input('weight', sql.NVarChar, weight);
        request.input('img', sql.NVarChar(100), images);
       
        const query = `${ product_name!=name && newfirst?`INSERT into products(product_name, category,product_tax,product_image)values(@name,@cat,@tax,@img);`:``} insert into items(sale_price,regular_price,prime_price,item_weight,ministore_product_bonus,ministore_min_qty,item_stock,product_id) values(@sp,@rp,@mp,@weight,@bonus,@min,@stock,(select TOP 1 product_id from products order by id desc)) `
        if (newfirst) {
          request.query('INSERT into products(product_name, category,product_tax,product_image) output inserted.product_id values(@name,@cat,@tax,@img);')    
          request.input('ppid',sql.NVarChar, name);
          request.query('insert into items(sale_price,regular_price,prime_price,item_weight,ministore_product_bonus,ministore_min_qty,item_stock,product_id) values(@sp,@rp,@mp,@weight,@bonus,@min,@stock,@ppid)')
         
         
          newfirst=false
        } else if (product_name!=name) {
          request.query('INSERT into products(product_name, category,product_tax,product_image) output inserted.product_id values(@name,@cat,@tax,@img);')  
          request.input('id',sql.NVarChar, name);
          request.query('insert into items(sale_price,regular_price,prime_price,item_weight,ministore_product_bonus,ministore_min_qty,item_stock,product_id) values(@sp,@rp,@mp,@weight,@bonus,@min,@stock,@id)')
            
         
          product_name=name;
        } else {
          request.input('pid',sql.NVarChar, name);
          await request.query('insert into items(sale_price,regular_price,prime_price,item_weight,ministore_product_bonus,ministore_min_qty,item_stock,product_id) values(@sp,@rp,@mp,@weight,@bonus,@min,@stock,@pid)')
        }
       
    }
});

router.get('/', (req, res) => {
    try {
        console.log(req.query);
        if (req.query.category == undefined) {
          req.app.locals.db.query('select p.product_id,p.product_name,p.category,p.product_tax,p.product_image,item.item_id,item.item_stock,item.sale_price,item.regular_price,item.prime_price,item.ministore_min_qty,item.ministore_product_bonus,item.item_weight,c.category_name from products as p join items as item  on p.product_id=item.product_id join categories as c on p.category=c.category_id where p.product_status=1 ', (queryErr, result) => {
            if(queryErr) {
              res.json({res:false});
              console.log(queryErr);
            } else {
              const data = result.recordset;

              const productItemsDict = {};

              // iterate through each element of the given JSON array
              data.forEach((d) => {
                const { item_id,sale_price,regular_price,item_weight,ministore_min_qty,ministore_product_bonus, item_stock,prime_price } = d;
                const {product_id,product_image,product_name,product_tax,category,category_name} = d;
                // if the product_id is not already present in the productItemsDict
                if (!productItemsDict[product_id]) {
                  // create a new array with the item_id as value
                  productItemsDict[product_id] = {
                    product_id,
                    product_image,
                    product_name,
                    category,
                    product_tax,
                    category_name,
                    items : []
                  };
                }

                // append the item_id to the array corresponding to the product_id in the productItemsDict
                productItemsDict[product_id].items.push({sale_price,regular_price,item_weight,item_id,item_stock,ministore_min_qty,ministore_product_bonus,prime_price});
              });

              

              // iterate through the productItemsDict and create a new array of objects
              
              res.json({
                res: true,
                products: Object.values(productItemsDict)
            });
            } 
            
          });
        } else {
          const request = req.app.locals.db.request();
          request.input('category',sql.NVarChar,`${req.query.category}`);
          request.query(`select p.product_id,p.product_name,p.category,p.product_tax,p.product_image,item.item_id,item.item_stock,item.sale_price,item.regular_price,item.prime_price,item.ministore_min_qty,item.ministore_product_bonus,item.item_weight,c.category_name from products as p join items as item  on p.product_id=item.product_id join categories as c on p.category=c.category_id where p.product_status=1 and p.category=@category`, (queryErr, result) => {
            if(queryErr) {
              res.json({res:false});
              console.log(queryErr)
            } else {
              const data = result.recordset;

              const productItemsDict = {};

              // iterate through each element of the given JSON array
              data.forEach((d) => {
                const { item_id,sale_price,regular_price,item_weight,ministore_min_qty,ministore_product_bonus, item_stock,prime_price } = d;
                const {product_id,product_image,product_name,product_tax,category,category_name} = d;
                // if the product_id is not already present in the productItemsDict
                if (!productItemsDict[product_id]) {
                  // create a new array with the item_id as value
                  productItemsDict[product_id] = {
                    product_id,
                    product_image,
                    product_name,
                    category,
                    product_tax,
                    category_name,
                    items : []
                  };
                }

                // append the item_id to the array corresponding to the product_id in the productItemsDict
                productItemsDict[product_id].items.push({sale_price,regular_price,item_weight,item_id,item_stock,ministore_min_qty,ministore_product_bonus,prime_price});
              });

              

              // iterate through the productItemsDict and create a new array of objects
              
                res.json({
                  res: true,
                  products: Object.values(productItemsDict)
              });
            }
        });
        } 
        
    } catch (err) {
        console.error(err);
        res.json({
            res: false
        });
    }
});

router.get('/home',(req,res)=>{

  try {
    req.app.locals.db.query('select cart.category_name,p.product_id,p.product_name,p.category,p.product_tax,p.product_image,item.item_id,item.item_stock,item.sale_price,item.regular_price,item.prime_price,item.ministore_min_qty,item.ministore_product_bonus,item.item_weight from products as p join items as item  on p.product_id=item.product_id join categories as cart on p.category=cart.category_id where p.product_status=1',(queryErr,result)=>{

      if (!queryErr) {
        const productsData = result.recordset;
        const data = productsData;

              const productItemsDict = {};

              // iterate through each element of the given JSON array
              data.forEach((d) => {
                const { item_id,sale_price,regular_price,item_weight,ministore_min_qty,ministore_product_bonus, item_stock,prime_price } = d;
                const {product_id,product_image,product_name,product_tax,category,category_name} = d;
                // if the product_id is not already present in the productItemsDict
                if (!productItemsDict[product_id]) {
                  // create a new array with the item_id as value
                  productItemsDict[product_id] = {
                    product_id,
                    product_image,
                    product_name,
                    category,
                    product_tax,
                    category_name,
                    items : []
                  };
                }

                // append the item_id to the array corresponding to the product_id in the productItemsDict
                productItemsDict[product_id].items.push({sale_price,regular_price,item_weight,item_id,item_stock,ministore_min_qty,ministore_product_bonus,prime_price});
              });
        const resData = {
          'Millets' : [],
          'Masalas and Spices' : [],
          'Tradition Rice' : [],
          'Special Offer' : []
        }
        Object.values(productItemsDict).forEach(row => {
          if (row.category_name == "Millets") {
            resData.Millets.push(row);
          } else if (row.category_name == "Masalas and Spices") {
            resData['Masalas and Spices'].push(row);
          } else if (row.category_name == "Tradition Rice") {
            resData['Tradition Rice'].push(row);
          } else if (row.category_name == "Salt-Sugar and Jaggery") {
            resData['Special Offer'].push(row);
          }
        });
        res.json({res:true, data:resData});
      }

    });
  } catch (error) {
    console.error(error);
    console.log("Something Went wrong!");
    res.json({res:fasle});
  }

});


router.post('/cart/:cart_action',(req,res,next)=>{
  if(req.isAuthenticated()) {
    next()
  } 
},(req,res)=>{
  const request = req.app.locals.db.request();
  if (req.params.cart_action == 'add') {
    request.input('item_id',sql.NVarChar,req.body.item_id);
    request.input('user_id',sql.NVarChar,req.user.id);
    request.query('declare @cart_id NVARCHAR(50); set @cart_id=(select cart_id from CartTable where user_id=@user_id); insert into CartItems(cart_id,item_id) values(@cart_id,@item_id);',(queryErr,result)=>{
      if(!queryErr) {
        res.json({res:true, action : true});
      } else {
        console.log(queryErr);
        res.json({res:false});
      }
    });
  } else if (req.params.cart_action == 'get') {
    console.log(req.user);
    request.input('user_id',sql.NVarChar,req.user.id);
    request.query('select cart.cart_id, item.item_id, item.quantity,itd.sale_price,itd.regular_price, itd.prime_price, itd.ministore_min_qty, itd.item_weight, itd.item_stock, itd.ministore_product_bonus,p.product_id ,p.product_name, p.product_tax, p.product_image,p.category from CartTable as cart join CartItems as item on  cart.cart_id=item.cart_id join items as itd on itd.item_id=item.item_id join products as p on p.product_id=itd.product_id where cart.user_id=@user_id;',(queryErr,result)=>{
      if(!queryErr) {
        
        res.json({res:true, cart : result.recordset, action : true});
      } else {
        console.log(queryErr);
        res.json({res:false});
      }
    });
  } else if (req.params.cart_action == 'update') {
    request.input('item_id',sql.NVarChar,req.body.item_id);
    request.input('user_id',sql.NVarChar,req.user.id);
    request.input('qty',sql.Int,req.body.quantity);
    request.query('update item set quantity=@qty from CartItems as item join CartTable as c on item.cart_id=c.cart_id  where c.user_id=@user_id and item_id=@item_id',(queryErr,result)=>{
      if(!queryErr) {
        res.json({res:true, action:true});
      } else {
        res.json({res:false});
      }
    });

  } else if (req.params.cart_action == 'remove') {
    request.input('item_id',sql.NVarChar,req.body.item_id);
    request.input('user_id',sql.NVarChar,req.user.id);
    request.query('delete item  from CartItems as item join CartTable as cart on item.cart_id=cart.cart_id where cart.user_id=@user_id and item.item_id=@item_id',(queryErr,result)=>{
      if(!queryErr) {
        res.json({res:true,action : true});
      } else {
        console.log(queryErr);
        res.json({res:false});
      }
    });
  } else {
    res.json({res:true, action : false});
  }
});

router.post('/wishlist/:action',(req,res)=>{
  const request = req.app.locals.db.request();
  if(req.params.action == 'add') {
    request.input('item_id',sql.NVarChar,req.body.item_id);
    request.input('wishlist_id', sql.NVarChar,req.body.wishlist_id);
    request.query('insert into WishlistItems(cart_id,item_id) values(@wishlist_id,@item_id);',(queryErr,result)=>{
      if(!queryErr) {
        res.json({res:true, action : true});
      } else {
        res.json({res:false});
      }
    });
  } else if (req.params.action == 'get') {
    request.input('user_id',sql.NVarChar,req.user.id);
    request.query('select cart.wishlist_id, item.item_id,itd.sale_price,itd.regular_price, itd.prime_price, itd.ministore_min_qty, itd.item_weight, itd.item_stock, itd.ministore_product_bonus,p.product_id ,p.product_name, p.product_tax, p.product_image,p.category from WishlistTable as wishlist join WishlistItems as item join on  wishlist.wishlist_id=item.wishlist_id join items as itd on itd.item_id=item.item_id join product as p on p.product_id=itd.product_id where cart.user_id=@user_id;',(queryErr,result)=>{
      if(!queryErr) {
        res.json({res:true, cart : result.recordset, action : true});
      } else {
        res.json({res:false});
      }
    });
  } else if (req.params.action == 'remove') {
      request.input('item_id',sql.NVarChar,req.body.item_id);
      request.input('wishlist_id', sql.NVarChar,req.body.wishlist_id);
      request.query('delete WishlistItems where cart_id=@wishlist_id and item_id=@item_id',(queryErr,result)=>{
        if(!queryErr) {
          res.json({res:true, action:true});
        } else {
          res.json({res:false});
        }
      });
  } else {
    res.json({res:true, action : false});
  }
});

router.get('/category',(req,res)=>{
  req.app.locals.db.query('select category_id,category_name from  categories',(queryErr,result)=>{
    res.json({res:true,data:result.recordset});
  });
});


module.exports = router;

const result = [
    {
      "keys": [
        "a",
        "b"
      ],
      "length": 2,
      "_fields": [
        {
          "identity": {
            "low": 0,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "naresh"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:0"
        },
        {
          "identity": {
            "low": 1,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "ayush"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:1"
        }
      ],
      "_fieldLookup": {
        "a": 0,
        "b": 1
      }
    },
    {
      "keys": [
        "a",
        "b"
      ],
      "length": 2,
      "_fields": [
        {
          "identity": {
            "low": 0,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "naresh"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:0"
        },
        {
          "identity": {
            "low": 2,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "neil"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:2"
        }
      ],
      "_fieldLookup": {
        "a": 0,
        "b": 1
      }
    },
    {
      "keys": [
        "a",
        "b"
      ],
      "length": 2,
      "_fields": [
        {
          "identity": {
            "low": 1,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "ayush"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:1"
        },
        {
          "identity": {
            "low": 3,
            "high": 0
          },
          "labels": [
            "Person"
          ],
          "properties": {
            "name": "ash"
          },
          "elementId": "4:f7233c03-1852-4202-b7d5-1cbd593b4855:3"
        }
      ],
      "_fieldLookup": {
        "a": 0,
        "b": 1
      }
    }
]

