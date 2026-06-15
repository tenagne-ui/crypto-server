const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

// የኮርስ እና የቦዲ ፓርሰር ፈቃድ
app.use(cors());
app.use(bodyParser.json());

const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY; 
const FAUCETPAY_CURRENCY = "USDT"; 

// 1. የጤና ፍተሻ
app.get('/api', (req, res) => {
    res.json({ message: "Crypto Payout Server is running perfectly!" });
});

// 2. የተስተካከለው የክሪፕቶ ማውጫ ክፍል
app.post('/api/withdraw', async (req, res) => {
    const { email, amount } = req.body;

    if (!email || !amount || amount < 1000) {
        return res.status(400).json({ error: "ያልተሟላ መረጃ ወይም አነስተኛው የሳንቲም ገደብ አልተሞላም" });
    }

    // 1000 ሳንቲም = 100,000 Satoshi (0.001 USDT)
    const satoshiAmount = amount * 100; 

    try {
        // FaucetPay የሚፈልገው ፎርማት FormData ወይም URL Encoded መሆን ስላለበት በአዲስ መልክ ተዋቅሯል
        const params = new URLSearchParams();
        params.append('api_key', FAUCETPAY_API_KEY);
        params.append('amount', satoshiAmount.toString());
        params.append('currency', FAUCETPAY_CURRENCY);
        params.append('to', email);
        params.append('referral', 'false');

        const response = await axios.post('https://faucetpay.io/api/v1/send', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // ከ FaucetPay የመጣውን ምላሽ መፈተሽ
        if (response.data && response.data.status === 200) {
            return res.status(200).json({ 
                success: true, 
                message: "ክፍያው በተሳካ ሁኔታ ተልኳል!", 
                txid: response.data.txid
            });
        } else {
            return res.status(400).json({ 
                error: response.data.message || "የ FaucetPay ግብይት አልተሳካም" 
            });
        }

    } catch (error) {
        console.error("Payout Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "በክፍያ ሂደት ላይ የውስጥ ሰርቨር ስህተት አጋጥሟል" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
