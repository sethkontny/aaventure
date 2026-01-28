const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const BlockchainUtils = require('../utils/blockchainUtils');

/**
 * Get current REC token balance (on-chain)
 */
router.get('/balance', auth, async (req, res) => {
    try {
        if (!req.user.walletAddress) {
            return res.json({ success: true, balance: "0", note: "Wallet not connected" });
        }
        
        const balance = await BlockchainUtils.getTokenBalance(req.user.walletAddress);
        res.json({ success: true, balance });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

/**
 * P2P Tipping - Send REC tokens to another user in the room
 */
router.post('/tip', auth, async (req, res) => {
    try {
        const { recipientChatName, amount } = req.body;
        
        if (!recipientChatName || !amount) {
            return res.status(400).json({ error: 'Recipient and amount required' });
        }

        // Find recipient in DB to get their wallet address
        const recipient = await User.findOne({ chatName: recipientChatName });
        
        if (!recipient || !recipient.walletAddress) {
            return res.status(404).json({ error: 'Recipient wallet not found or user not linked' });
        }

        // Ensure sender has wallet connected
        if (!req.user.walletAddress) {
            return res.status(400).json({ error: 'Connect your wallet to send tips' });
        }

        // In a real implementation, the frontend would handle the transfer via MetaMask
        // Here we simulate the server-side verification or handled if using a custodial wallet
        console.log(`💸 Tip initiated: ${req.user.chatName} -> ${recipientChatName} (${amount} REC)`);

        res.json({
            success: true,
            message: `Tip of ${amount} REC sent to ${recipientChatName}!`,
            recipientAddress: recipient.walletAddress
        });
    } catch (error) {
        console.error('Tip error:', error);
        res.status(500).json({ error: 'Failed to process tip' });
    }
});

module.exports = router;
