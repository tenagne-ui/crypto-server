const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY; 
const FAUCETPAY_CURRENCY = "USDT"; 

// Mock Database to track users, points, and referrals
// In production, you would replace this object with a database like MongoDB or PostgreSQL
const users = {
    "user_98765": { id: "user_98765", points: 5000, chests: 0, referredBy: null }
};

// Referral Rewards Configuration
const REFERRER_BONUS = 500; // Coins given to the person who shared their link
const NEW_USER_BONUS = 200; // Coins given to the new user who joined

// 1. Health Check
app.get('/api', (req, res) => {
    res.json({ message: "Crypto Payout Server with Referral System is running perfectly!" });
});

// 2. Fetch User Data (Updated to use mock database)
app.get('/api/user', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "User ID is required" });
    
    // If user doesn't exist, create a blank one for testing
    if (!users[id]) {
        users[id] = { id: id, points: 0, chests: 0, referredBy: null };
    }
    res.json(users[id]);
});

// 3. Sync/Update Data
app.post('/api/update', (req, res) => {
    const { id, points, chests } = req.body;
    if (!id) return res.status(400).json({ error: "Missing user ID" });
    
    if (!users[id]) users[id] = { id, referredBy: null };
    users[id].points = points;
    users[id].chests = chests;
    
    res.json({ success: true, user: users[id] });
});

// 4. New User Registration with Referral Code
app.post('/api/register', (req, res) => {
    const { id, referralCode } = req.body; // In this basic setup, the referralCode IS the referrer's User ID
    
    if (!id) return res.status(400).json({ error: "User ID is required" });
    if (users[id]) return res.status(400).json({ error: "User already registered" });

    let startingPoints = 0;
    let referredBy = null;

    // Check if a valid referral code was supplied, and ensure they aren't referring themselves
    if (referralCode && users[referralCode] && referralCode !== id) {
        referredBy = referralCode;
        startingPoints += NEW_USER_BONUS;
        
        // Award the bonus to the person who invited them
        users[referralCode].points += REFERRER_BONUS;
        console.log(`Referral Success! ${referralCode} earned ${REFERRER_BONUS} coins for inviting ${id}`);
    }

    // Save the new user
    users[id] = { id: id, points: startingPoints, chests: 0, referredBy: referredBy };
    
    res.status(200).json({ 
        success: true, 
        message: referralCode ? "Registered successfully with referral bonus!" : "Registered successfully!",
        user: users[id]
    });
});

// 5. Crypto Withdrawal
app.post('/api/withdraw', async (req, res) => {
    const { email, amount, id } = req.body;

    if (!email || !amount || amount < 1000) {
        return res.status(400).json({ error: "Incomplete data or minimum coin threshold not met." });
    }

    // Deduct coins locally if ID is supplied
    if (id && users[id]) {
        if (users[id].points < amount) return res.status(400).json({ error: "Insufficient balance" });
        users[id].points -= amount;
    }

    const satoshiAmount = amount * 100; 

    try {
        const params = new URLSearchParams();
        params.append('api_key', FAUCETPAY_API_KEY);
        params.append('amount', satoshiAmount.toString());
        params.append('currency', FAUCETPAY_CURRENCY);
        params.append('to', email);
        params.append('referral', 'false');

        const response = await axios.post('https://faucetpay.io/api/v1/send', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data && response.data.status === 200) {
            return res.status(200).json({ 
                success: true, 
                message: "Payout completed successfully!", 
                txid: response.data.txid
            });
        } else {
            // Refund points if FaucetPay fails
            if (id && users[id]) users[id].points += amount;
            return res.status(400).json({ 
                error: response.data.message || "FaucetPay transaction failed." 
            });
        }

    } catch (error) {
        if (id && users[id]) users[id].points += amount;
        console.error("Payout Error:", error.message);
        return res.status(500).json({ error: "Internal server error occurred." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
