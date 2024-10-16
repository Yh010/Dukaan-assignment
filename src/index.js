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
      { expiresIn: '1h' } 
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


app.post('/create-seller-store', (req, res) => {
    const { storename, storeaddress } = req.body;
    //create store in store table
    //unique link ??
    //get store id from db , and => res.send(storeId,link)
})
app.post('/seller-upload-inventory', (req, res) => {
    const { productName, description, mrp, salePrice, image, category } = req.body;
//Create a category if it doesn't exist.
    //Create product
    //res.send(id, name and image);    
})

//maybe this is covered in /buyer-place-order
app.post('/seller-accept-orders', (req, res) => {
    //
})

//buyer endpoints

app.get('/buyer-store-details', (req, res) => {
    const { storelink } = req.body;
    //db call to get store details
    //res.send(storeId, store name, address)
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