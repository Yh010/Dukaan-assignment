const { pool } = require("../db/poolfunction");

async function createSeller(otp,mobile_number) {
    const res = await pool.query(
        "INSERT INTO accounts (otp, mobile_number) VALUES ($1, $2)",
        [otp, mobile_number]
        );
    console.log(`Added a seller with the mobile ${mobile_number}`);
}
module.exports = {createSeller}