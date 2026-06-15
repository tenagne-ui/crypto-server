const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

// የFlutter አፑ እና ሰርቨሩ ያለ ምንም የደህንነት እገዳ እንዲገናኙ መፍቀድ
app.use(cors());
app.use(bodyParser.json());

// የ FaucetPay API መረጃዎች (በRender.com ላይ በምስጢር የሚቀመጡ)
const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY; 
const FAUCETPAY_CURRENCY = "USDT"; // ለተጠቃሚው የሚላከው የክሪፕቶ አይነት (USDT)

// 1. ሰርቨሩ መስራቱን ማረጋገጫ ገጽ (የጤና ፍተሻ)
app.get('/api', (req, res) => {
    res.json({ message: "Crypto Payout Server is running perfectly!" });
});

// 2. የክሪፕቶ ማውጫ ክፍል (Withdrawal Endpoint)
app.post('/api/withdraw', async (req, res) => {
    const { email, amount } = req.body;

    // ሀ. የመጣው መረጃ ትክክል መሆኑን እና አነስተኛውን ገደብ መሙላቱን መፈተሽ
    // ተጠቃሚው ቢያንስ 1000 ሳንቲም ሲኖረው ብቻ ነው ማውጣት የሚችለው
    if (!email || !amount || amount < 1000) {
        return res.status(400).json({ error: "ያልተሟላ መረጃ ወይም አነስተኛው የሳንቲም ገደብ አልተሞላም" });
    }

    // ለ. የአፑን ሳንቲም ወደ FaucetPay ክሪፕቶ (Satoshi) መቀየር
    // እዚህ ጋር ሂሳቡን እንደ ፍላጎትዎ መቀየር ይችላሉ። 
    // ለምሳሌ፦ 1000 ሳንቲም = 100,000 Satoshi (0.001 USDT) ለማድረግ በ 100 እናባዛዋለን
    const satoshiAmount = amount * 100; 

    try {
        // ሐ. በቀጥታ ወደ FaucetPay ሰርቨር የክፍያ ጥያቄ መላክ
        const response = await axios.post('https://faucetpay.io/api/v1/send', {
            api_key: FAUCETPAY_API_KEY,
            amount: satoshiAmount,
            currency: FAUCETPAY_CURRENCY,
            to: email,
            referral: "false"
        });

        // መ. ከ FaucetPay የመጣውን ምላሽ መገምገም
        if (response.data.status === 200) {
            return res.status(200).json({ 
                success: true, 
                message: "ክፍያው በተሳካ ሁኔታ ተልኳል!", 
                txid: response.data.txid // የክፍያ መታወቂያ ቁጥር
            });
        } else {
            return res.status(400).json({ 
                error: response.data.message || "የ FaucetPay ግብይት አልተሳካም" 
            });
        }

    } catch (error) {
        console.error("Payout Error:", error.message);
        return res.status(500).json({ error: "በክፍያ ሂደት ላይ የውስጥ ሰርቨር ስህተት አጋጥሟል" });
    }
});

// ሰርቨሩ የሚነሳበት መስመር (Port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
