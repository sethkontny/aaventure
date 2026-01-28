const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying AAVenture Smart Contracts to Local Network\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Deploy RecoveryPassport
    console.log("🎫 Deploying RecoveryPassport...");
    const PassportFactory = await hre.ethers.getContractFactory("RecoveryPassport");
    const passport = await PassportFactory.deploy();
    await passport.waitForDeployment();
    const passportAddress = await passport.getAddress();
    console.log("✅ RecoveryPassport deployed to:", passportAddress);

    // Deploy RecoveryToken
    console.log("\n🪙 Deploying RecoveryToken...");
    const TokenFactory = await hre.ethers.getContractFactory("RecoveryToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ RecoveryToken deployed to:", tokenAddress);

    // Output deployment summary
    console.log("\n" + "=".repeat(70));
    console.log("📋 LOCAL DEPLOYMENT SUMMARY");
    console.log("=".repeat(70));
    console.log("Network: Localhost");
    console.log("Deployer:", deployer.address);
    console.log("RecoveryPassport:", passportAddress);
    console.log("RecoveryToken:", tokenAddress);
    console.log("=".repeat(70));

    console.log("\n📝 Update your .env file for local development:");
    console.log(`PASSPORT_CONTRACT_ADDRESS=${passportAddress}`);
    console.log(`RECOVERY_TOKEN_ADDRESS=${tokenAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
