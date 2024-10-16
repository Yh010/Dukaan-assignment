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
})

app.post('/seller-accept-orders', async (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ message: 'Order ID is required' });
    }

    try {
        await pool.query(`
            UPDATE orders SET order_status = 'Accepted' WHERE id = $1
        `, [order_id]);

        res.json({ message: 'Order accepted successfully', orderId: order_id });
    } catch (error) {
        console.error('Error while accepting order:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});


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

app.get('/buyer-product-details', async (req, res) => {
    const { storelink } = req.query;

    if (!storelink) {
        return res.status(400).json({ message: 'Store link is required' });
    }

    try {
        
        const storeResult = await pool.query(`
            SELECT id FROM stores WHERE store_link = $1
        `, [storelink]);

        if (storeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const storeId = storeResult.rows[0].id;
        const productsResult = await pool.query(`
            SELECT c.category_name, p.product_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.store_id = $1
            ORDER BY c.category_name, p.product_name
        `, [storeId]);

        const catalog = {};
        productsResult.rows.forEach(product => {
            const { category_name, product_name } = product;

            if (!catalog[category_name]) {
                catalog[category_name] = {
                    count: 0,
                    products: []
                };
            }
            catalog[category_name].count++;
            catalog[category_name].products.push(product_name);
        });

        const sortedCatalog = Object.entries(catalog)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([category_name, { count, products }]) => ({
                category_name,
                count,
                products
            }));

        res.json(sortedCatalog);
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/buyer-add-to-cart', async (req, res) => {
    const { product_id, quantity, storeLink } = req.body;

    if (!product_id || !quantity || !storeLink) {
        return res.status(400).json({ message: 'product_id, quantity, and storeLink are required' });
    }

    try {
        const storeResult = await pool.query(`
            SELECT id FROM stores WHERE store_link = $1
        `, [storeLink]);

        if (storeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const store_id = storeResult.rows[0].id;

        const productResult = await pool.query(`
            SELECT * FROM products WHERE id = $1 AND store_id = $2
        `, [product_id, store_id]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found in this store' });
        }

        const session_id = req.headers['session-id'] || req.body.session_id; // assuming this will be sent by the frontend

        if (!session_id) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        const cartItemResult = await pool.query(`
            SELECT * FROM cart WHERE session_id = $1 AND product_id = $2
        `, [session_id, product_id]);

        if (cartItemResult.rows.length > 0) {
            const existingQuantity = cartItemResult.rows[0].quantity + quantity;
            await pool.query(`
                UPDATE cart SET quantity = $1 WHERE session_id = $2 AND product_id = $3
            `, [existingQuantity, session_id, product_id]);
        } else {
            await pool.query(`
                INSERT INTO cart (session_id, product_id, quantity, store_id) 
                VALUES ($1, $2, $3, $4)
            `, [session_id, product_id, quantity, store_id]);
        }

        res.json({ message: 'Item added to cart successfully' });

    } catch (error) {
        console.error('Error while adding to cart:', error);
    }
});


app.post('/buyer-place-order', async (req, res) => {
    const { otp, mobile, cart } = req.body;

    if (!otp || !mobile || !cart || cart.length === 0) {
        return res.status(400).json({ message: 'OTP, mobile number, and cart are required' });
    }

    try {

        const customerResult = await pool.query(`
            INSERT INTO customers (mobile_number) 
            VALUES ($1) 
            ON CONFLICT (mobile_number) 
            DO NOTHING 
            RETURNING id
        `, [mobile]);

        const customer_id = customerResult.rows.length > 0 ? customerResult.rows[0].id : (await pool.query(`
            SELECT id FROM customers WHERE mobile_number = $1
        `, [mobile])).rows[0].id;

        let total_price = 0;
        const orderItems = [];

        for (const item of cart) {
            const { product_id, quantity, store_id } = item;

            const productResult = await pool.query(`
                SELECT sale_price FROM products WHERE id = $1 AND store_id = $2
            `, [product_id, store_id]);

            if (productResult.rows.length === 0) {
                return res.status(404).json({ message: `Product ID ${product_id} not found in store ID ${store_id}` });
            }

            const price = productResult.rows[0].sale_price;
            total_price += price * quantity;

            orderItems.push({
                product_id,
                quantity,
                price 
            });
        }

        const orderResult = await pool.query(`
            INSERT INTO orders (store_id, customer_id, total_price) 
            VALUES ($1, $2, $3) 
            RETURNING id
        `, [cart[0].store_id, customer_id, total_price]);

        const order_id = orderResult.rows[0].id;

        for (const item of orderItems) {
            await pool.query(`
                INSERT INTO order_items (order_id, product_id, quantity, price) 
                VALUES ($1, $2, $3, $4)
            `, [order_id, item.product_id, item.quantity, item.price]);
        }

        res.json({ message: 'Order placed successfully', orderId: order_id });

    } catch (error) {
        console.error('Error while placing order:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
