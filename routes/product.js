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
    return {
        price: random_price,
        sale_price: sale_price,
        ministore: ministore,
    };
}

let category;
let first = false;
let img, flag = false;

router.get('/update', (req, res) => {

    fs.createReadStream('/Users/naresh_dev/Developments/MIC-Backend/routes/product_lists.csv')
        .pipe(csv())
        .on('data', (data) => {
            if (!first) {
                category = data.Categories;
                img = data.Images;
                first = true;
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
                insertDataToDB(data.Name, data.Categories, price.price, price.sale_price, price.ministore, data.weight, data.Images);
            }
            console.log(data.ID, );

        }).on('end', () => {
            console.log('Successfully read');
        });
    async function insertDataToDB(name, cat, rp, sp, mp, weight, images) {
        const request = req.app.locals.db.request();
        request.input('name', sql.NVarChar, name);
        request.input('cat', sql.NVarChar, cat);
        request.input('rp', sql.Decimal, rp);
        request.input('sp', sql.Decimal, sp);
        request.input('mp', sql.Decimal, mp);
        request.input('weight', sql.NVarChar, weight);
        request.input('img', sql.NVarChar(100), images);
        const result = await request.query('insert into items(item_name,sale_price,regular_price,ministore_price,item_weight,category,images) values(@name,@sp,@rp,@mp,@weight,@cat,@img)');
        console.log(result);
    }
});

router.get('/', (req, res) => {
    try {
        console.log(req.query);
        if (req.query.category == undefined) {
          req.app.locals.db.query('select * from items', (queryErr, result) => {
              res.json({
                  res: true,
                  products: result.recordset
              });
          });
        } else {
          const request = req.app.locals.db.request();
          request.input('category',sql.NVarChar,req.query.category);
          request.query(`select * from items where category = @category`, (queryErr, result) => {
            res.json({
                res: true,
                products: result.recordset
            });
        });
        } 
        
    } catch (err) {
        console.err(err);
        res.json({
            res: false
        });
    }
});

router.get('/home',(req,res)=>{

  try {
    req.app.locals.db.query('select * from items',(queryErr,result)=>{

      if (!queryErr) {
        const productsData = result.recordset;
        const resData = {
          'Millets' : [],
          'Masalas & Spices' : [],
          'Tradition Rice' : [],
          'Special Offer' : []
        }
        productsData.forEach(row => {
          if (row.category == "Millets") {
            resData.Millets.push(row);
          } else if (row.category == "Masalas & Spices") {
            resData['Masalas & Spices'].push(row);
          } else if (row.category == "Tradition Rice") {
            resData['Tradition Rice'].push(row);
          } else if (row.category == "Salt-Sugar & Jaggery") {
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


router.get('/category',(req,res)=>{
  req.app.locals.db.query('select distinct category from items',(queryErr,result)=>{
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

