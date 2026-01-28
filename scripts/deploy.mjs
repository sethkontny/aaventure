import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const RecoveryPassportArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/RecoveryPassport.sol/RecoveryPassport.json", "utf8")
);

const RecoveryTokenArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/RecoveryToken.sol/RecoveryToken.json", "utf8")
);

async function main() {
    console.log("🚀 Deploying AAVenture Smart Contracts to Base Sepolia\n");

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);

    console.log("📝 Deploying with account:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        console.log("❌ ERROR: No ETH in wallet!");
        console.log("\n📍 Get test ETH from:");
        console.log("   - https://www.alchemy.com/faucets/base-sepolia");
        console.log("   - https://faucet.quicknode.com/base/sepolia");
        console.log("\n   Use address:", wallet.address);
        process.exit(1);
    }

    // Deploy RecoveryPassport
    console.log("🎫 Deploying RecoveryPassport...");
    const PassportFactory = new ethers.ContractFactory(
        RecoveryPassportArtifact.abi,
        RecoveryPassportArtifact.bytecode,
        wallet
    );
    const passport = await PassportFactory.deploy();
    await passport.waitForDeployment();
    const passportAddress = await passport.getAddress();
    console.log("✅ RecoveryPassport deployed to:", passportAddress);

    // Deploy RecoveryToken
    console.log("\n🪙 Deploying RecoveryToken...");
    const TokenFactory = new ethers.ContractFactory(
        RecoveryTokenArtifact.abi,
        RecoveryTokenArtifact.bytecode,
        wallet
    );
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ RecoveryToken deployed to:", tokenAddress);

    // Output deployment summary
    console.log("\n" + "=".repeat(70));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(70));
    console.log("Network: Base Sepolia Testnet");
    console.log("Deployer:", wallet.address);
    console.log("RecoveryPassport:", passportAddress);
    console.log("RecoveryToken:", tokenAddress);
    console.log("=".repeat(70));

    console.log("\n📝 Add these to your .env file:");
    console.log(`PASSPORT_CONTRACT_ADDRESS=${passportAddress}`);
    console.log(`RECOVERY_TOKEN_ADDRESS=${tokenAddress}`);

    console.log("\n🔍 View on Basescan:");
    console.log(`Passport: https://sepolia.basescan.org/address/${passportAddress}`);
    console.log(`Token: https://sepolia.basescan.org/address/${tokenAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
