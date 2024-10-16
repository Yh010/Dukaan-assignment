const express = require('express')
var jwt = require('jsonwebtoken');
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

//seller endpoints

app.post('/seller-signup', (req, res) => {
    
})
app.post('/create-seller-store', (req, res) => {
    
})
app.post('/seller-upload-inventory', (req, res) => {
    
})
app.post('/seller-accept-orders', (req, res) => {
    
})

//buyer endpoints

app.get('/buyer-store-details', (req, res) => {
    
})

app.get('/buyer-product-details', (req, res) => {
    
})

app.post('/buyer-add-to-cart', (req, res) => {
    
})

app.post('/buyer-place-order', (req, res) => {
    
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
