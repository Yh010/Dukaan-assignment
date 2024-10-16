const express = require('express')
var jwt = require('jsonwebtoken');
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

//seller endpoints

app.post('/seller-signup', (req, res) => {
    const { otp, mobile } = req.body;
    //TODO: Create customer account in accounts table
    //Issue a token.
    
})
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