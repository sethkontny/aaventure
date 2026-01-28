# AAVenture Blockchain Integration Guide

## Overview
AAVenture uses blockchain technology to provide:
- 🎫 **Recovery Passport NFTs**: Soulbound (non-transferable) NFTs tracking recovery journey
- 🪙 **Recovery Tokens (REC)**: Reward tokens for attending meetings

## Network: Base (Coinbase L2)
- **Mainnet**: Low cost, high speed
- **Testnet (Base Sepolia)**: Free testing before mainnet

---

## Quick Start: Deploy to Base Testnet

### 1. Get a Wallet Private Key
```bash
# Create a new wallet with MetaMask or use existing
# Export your private key (NEVER share this!)
```

### 2. Get Free Testnet ETH
Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Connect your wallet
- Request Base Sepolia ETH (free)
- You need ~0.01 ETH for deployment

### 3. Set Environment Variables
Add to your `.env` file:
```bash
# Blockchain Configuration (Base Sepolia Testnet)
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key_here
BASESCAN_API_KEY=optional_for_verification

# These will be auto-populated after deployment:
PASSPORT_CONTRACT_ADDRESS=
RECOVERY_TOKEN_ADDRESS=
```

### 4. Install Dependencies
```bash
cd /Users/smk/dev/aaventure
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv
```

### 5. Deploy Contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 6. Copy Contract Addresses
The script will output addresses like:
```
PASSPORT_CONTRACT_ADDRESS=0x123...
RECOVERY_TOKEN_ADDRESS=0x456...
```
Add these to your `.env` file.

### 7. Restart Server
```bash
npm run dev
```
You should see: `✅ Blockchain integration initialized`

---

## How It Works

### Recovery Passport NFT
- One per user (soulbound = can't transfer)
- Tracks: Join date, sobriety date, meetings attended
- Minted when user clicks "Mint Passport" in Attendance page

### Recovery Token (REC)
- Reward for attending meetings
- 10 REC per meeting attended
- Can be used for future features (premium access, etc.)

### Backend Integration
When a user generates a certificate:
1. Backend calls `incrementMeetings(passportId)` on smart contract
2. Backend calls `mint(userAddress, 10 REC)` on token contract
3. User's on-chain stats update automatically

---

## Testing Locally (Optional)

### Start Local Blockchain
```bash
npx hardhat node
```

### Deploy to Local Network (terminal 2)
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

## Mainnet Deployment (When Ready)

### Cost Estimate
- Deployment: ~$5-10 (one-time)
- Per transaction: ~$0.01-0.05

### Steps
```bash
# 1. Get real ETH on Base Mainnet
# 2. Update .env:
BLOCKCHAIN_RPC_URL=https://mainnet.base.org

# 3. Deploy
npx hardhat run scripts/deploy.js --network base

# 4. Update .env with new addresses
```

---

## Frontend Changes Needed
Your frontend already has wallet connection code! Just ensure:
- Users can connect MetaMask
- Base Sepolia network is added to MetaMask
- UI shows "Mint Passport" button

---

## Troubleshooting

### "Insufficient funds"
- Get more test ETH from faucet

### "Network not found"
- Add Base Sepolia to MetaMask:
  - Network Name: Base Sepolia
  - RPC URL: https://sepolia.base.org
  - Chain ID: 84532
  - Currency: ETH

### "Contract not verified"
- Get free Basescan API key: https://basescan.org/apis
- Add to .env: `BASESCAN_API_KEY=your_key`

---

## Next Steps
1. Deploy to testnet
2. Test minting a passport
3. Test attending a meeting (check on-chain counter)
4. View on Basescan: https://sepolia.basescan.org/
