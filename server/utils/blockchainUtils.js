const { ethers } = require('ethers');

// ABI for RecoveryPassport
const PASSPORT_ABI = [
  "function hasPassport(address) view returns (bool)",
  "function mintPassport(uint256 _sobrietyDate) external",
  "function incrementMeetings(uint256 tokenId) external",
  "function passportData(uint256) view returns (uint256 joinDate, uint256 sobrietyDate, uint256 meetingsAttended, bool isOfficial)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event PassportMinted(address indexed user, uint256 tokenId, uint256 joinDate)"
];

// ABI for RecoveryToken
const TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)"
];

// Configuration from environment variables
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const PASSPORT_ADDRESS = process.env.PASSPORT_CONTRACT_ADDRESS;
const TOKEN_ADDRESS = process.env.RECOVERY_TOKEN_ADDRESS;

class BlockchainUtils {
    constructor() {
        if (RPC_URL && PRIVATE_KEY && PASSPORT_ADDRESS) {
            this.provider = new ethers.JsonRpcProvider(RPC_URL);
            this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
            this.passportContract = new ethers.Contract(PASSPORT_ADDRESS, PASSPORT_ABI, this.wallet);
            
            if (TOKEN_ADDRESS) {
                this.tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, this.wallet);
            }
            
            this.isEnabled = true;
            console.log('✅ Blockchain integration initialized');
        } else {
            this.isEnabled = false;
            console.log('⚠️ Blockchain integration disabled (missing config)');
        }
    }

    /**
     * Reward user with RecoveryTokens
     * @param {string} address User's wallet address
     * @param {number} amount Amount of tokens (in ether units)
     */
    async rewardTokens(address, amount = 10) {
        if (!this.isEnabled || !this.tokenContract) {
            console.log(`💎 [SIMULATION] Rewarded ${amount} REC tokens to ${address}`);
            return "0xsimulated_token_reward_hash_" + Date.now();
        }
        try {
            const amountWei = ethers.parseEther(amount.toString());
            const tx = await this.tokenContract.mint(address, amountWei);
            await tx.wait();
            console.log(`💰 Rewarded ${amount} REC tokens to ${address}`);
            return tx.hash;
        } catch (error) {
            console.error('❌ Error rewarding tokens:', error);
            return null;
        }
    }

    /**
     * Get user's token balance
     */
    async getTokenBalance(address) {
        if (!this.isEnabled || !this.tokenContract) return "100.0"; // Demo balance
        try {
            const balance = await this.tokenContract.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('❌ Error fetching token balance:', error);
            return "0";
        }
    }

    /**
     * Increment meetings count for a user's on-chain passport
     * @param {string} tokenId The ID of the NFT passport
     */
    async incrementMeetings(tokenId) {
        if (!this.isEnabled) {
            console.log(`🎫 [SIMULATION] On-chain meetings incremented for token ${tokenId}`);
            return "0xsimulated_passport_increment_hash_" + Date.now();
        }
        try {
            const tx = await this.passportContract.incrementMeetings(tokenId);
            await tx.wait();
            console.log(`✅ On-chain meetings incremented for token ${tokenId}`);
            return tx.hash;
        } catch (error) {
            console.error('❌ Error incrementing on-chain meetings:', error);
            return null;
        }
    }

    /**
     * Check if a wallet has a passport
     * @param {string} address Wallet address
     */
    async hasPassport(address) {
        if (!this.isEnabled) return false;
        try {
            return await this.passportContract.hasPassport(address);
        } catch (error) {
            console.error('❌ Error checking passport existence:', error);
            return false;
        }
    }

    /**
     * Get passport data for a token
     */
    async getPassportData(tokenId) {
        if (!this.isEnabled) return null;
        try {
            const result = await this.passportContract.passportData(tokenId);
            return {
                joinDate: Number(result[0]),
                sobrietyDate: Number(result[1]),
                meetingsAttended: Number(result[2]),
                isOfficial: result[3]
            };
        } catch (error) {
            console.error('❌ Error fetching passport data:', error);
            return null;
        }
    }
}

module.exports = new BlockchainUtils();
