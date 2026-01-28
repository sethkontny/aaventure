import { ethers } from "ethers";

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log("\n🎉 NEW WALLET CREATED FOR TESTING");
console.log("=".repeat(60));
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
console.log("=".repeat(60));
console.log("\n⚠️  SAVE THIS INFORMATION!");
console.log("Add to .env file:");
console.log(`BLOCKCHAIN_PRIVATE_KEY=${wallet.privateKey}`);
console.log("\n📍 Get test ETH by visiting these faucets with your address:");
console.log("1. https://www.alchemy.com/faucets/base-sepolia");
console.log("2. https://faucet.quicknode.com/base/sepolia");
console.log("3. https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
