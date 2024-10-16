const express = require('express')
var jwt = require('jsonwebtoken');
const app = express()
const port = 3000
app.use(express.json());
require('dotenv').config()


const { Pool } = require('pg');


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!')
})

//seller endpoints

app.post('/seller-signup-initiate', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: 'Mobile number is required' });
  }
  //TODO: check if user already exists
  try {
    const otp = 123456;

    await pool.query(`
      INSERT INTO accounts (mobile_number, otp) 
      VALUES ($1, $2)
      ON CONFLICT (mobile_number) 
      DO UPDATE SET otp = $2, token = NULL`, [mobile, otp]);

    res.json({ message: 'your OTP ',otp:otp });
  } catch (error) {
    console.error('Error during signup initiation:', error);
    res.status(500).json({ message: 'Internal server error',error: error });
  }
});


app.post('/seller-signup-verify', async (req, res) => {
  const { mobile, otp } = req.body;
    //TODO: check if user already exists
  if (!mobile || !otp) {
    return res.status(400).json({ message: 'Mobile number and OTP are required' });
  }

  try {
    const result = await pool.query(`
      SELECT * FROM accounts WHERE mobile_number = $1 AND otp = $2
    `, [mobile, otp]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid mobile number or OTP' });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { account_id: user.id, mobile: user.mobile_number },
      process.env.jwt_secret,
      { expiresIn: '48h' } 
    );

    await pool.query(`
      UPDATE accounts 
      SET token = $1 
      WHERE mobile_number = $2
    `, [token, mobile]);

    res.json({ token, message: 'Signup successful' });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/create-seller-store', async (req, res) => {
    //TODO: handling duplicates
    const { storename, storeaddress } = req.body;

    if (!storename || !storeaddress) {
        return res.status(400).json({ message: 'Store name and address are required' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.jwt_secret);   
        const account_id = decoded.account_id;
        const storelink = `https://dukaan.com/${storename}`;
        const result = await pool.query(`
            INSERT INTO stores (account_id, store_name, store_address, store_link) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id
        `, [account_id, storename, storeaddress, storelink]);

         const store_id = result.rows[0].id;
        res.json({ store_id, storelink });
    } catch (error) {
         console.error('Error while creating store:', error);
    }
})
app.post('/seller-upload-inventory',async (req, res) => {
    const { productName, description, mrp, salePrice, image, category ,store_id } = req.body;
     if (!productName || !description || !mrp || !salePrice || !image || !category || !store_id) {
        return res.status(400).json({ message: 'productName, description, mrp, salePrice, image, category , store_id are required' });
     }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.jwt_secret);
        const account_id = decoded.account_id;

        let category_id;

        const categoryResult = await pool.query(`
            SELECT id FROM categories WHERE category_name = $1
    `   , [category]); 

        
        if (categoryResult.rows.length > 0) {
            category_id = categoryResult.rows[0].id;
        } else {
            const newCategoryResult = await pool.query(`
                INSERT INTO categories (category_name, store_id) VALUES ($1, $2) RETURNING id
        `   , [category, store_id]);
            category_id = newCategoryResult.rows[0].id;
        }

        const productResult = await pool.query(`
            INSERT INTO products (store_id, category_id, product_name, description, mrp, sale_price, image_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id
        `, [store_id, category_id, productName, description, mrp, salePrice, image]);

        const product_id = productResult.rows[0].id;
        res.json({
            message: "product created successfully",
            details:{ id: product_id, name: productName, image}
        });

    } catch (error) {
        console.error('Error while uploading inventory:', error);
    }
//Create a category if it doesn't exist.
    //Create product
    //res.send(id, name and image);    
})

//maybe this is covered in /buyer-place-order
app.post('/seller-accept-orders', (req, res) => {
    //
})

//buyer endpoints

app.get('/buyer-store-details',async (req, res) => {
    const { storelink } = req.query;
    
    if (!storelink) {
        return res.status(400).json({ message: 'Store link is required' });
    }
    try {
        const storesResult = await pool.query(`
        SELECT * FROM stores WHERE store_link = $1
`       , [storelink]);
        if (storesResult.rows.length === 0) {
            return res.status(404).json({ message: 'Store not found' });
        }   
        const store = storesResult.rows[0];
        const storeId = store.id;
        const storename = store.store_name;
        const address = store.store_address;

        res.send({
            storeId,storename, address
        })
        
    } catch (error) {
      console.error('Error fetching store details:', error);   
    }
   
})

app.get('/buyer-product-details', (req, res) => {
    const { storelink } = req.body;
    //db call to get all products in that store,
    /* eg response:
    Clothing (10 products):

    T-shirt
    Jeans
    Jacket
    Sneakers
    ... (6 more products)

Home & Kitchen (7 products):

    Blender
    Coffee Maker
    Vacuum Cleaner
    ... (4 more products) */
})

app.post('/buyer-add-to-cart', (req, res) => {
    //not sure what to do here
})

app.post('/buyer-place-order', (req, res) => {
    const { otp, mobile ,cart } = req.body;
    //jwt part
    ///create new customer if doesnt exist
    //Create an order for that store & customer 
    //res.send(orderId)
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


//TODO: postgres db and then jwt part