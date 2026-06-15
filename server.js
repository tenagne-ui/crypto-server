const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Allow communication between Flutter app and server without CORS restrictions
app.use(cors());
app.use(bodyParser.json());

// FaucetPay credentials stored as Environment Variables on Render.com
const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY; 
const FAUCETPAY_CURRENCY = "USDT"; // Crypto asset type sent to the user

// 1. Server Health Check Endpoint
app.get('/api', (req, res) => {
    res.json({ message: "Crypto Payout Server is running perfectly!" });
});

// 2. Crypto Withdrawal Endpoint
app.post('/api/withdraw', async (req, res) => {
    const { email, amount } = req.body;

    // Validate that the required parameters exist and meet the minimum threshold
    if (!email || !amount || amount < 1000) {
        return res.status(400).json({ error: "Incomplete data or minimum coin threshold not met." });
    }

    // Convert internal app coins to FaucetPay Crypto (Satoshi)
    // Example: 1000 coins = 100,000 Satoshi (0.001 USDT)
    const satoshiAmount = amount * 100; 

    try {
        // FaucetPay API expects application/x-www-form-urlencoded format
        const params = new URLSearchParams();
        params.append('api_key', FAUCETPAY_API_KEY);
        params.append('amount', satoshiAmount.toString());
        params.append('currency', FAUCETPAY_CURRENCY);
        params.append('to', email);
        params.append('referral', 'false');

        const response = await axios.post('https://faucetpay.io/api/v1/send', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Evaluate the response payload from FaucetPay
        if (response.data && response.data.status === 200) {
            return res.status(200).json({ 
                success: true, 
                message: "Payout completed successfully!", 
                txid: response.data.txid
            });
        } else {
            return res.status(400).json({ 
                error: response.data.message || "FaucetPay transaction failed." 
            });
        }

    } catch (error) {
        console.error("Payout Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Internal server error occurred during payout processing." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
