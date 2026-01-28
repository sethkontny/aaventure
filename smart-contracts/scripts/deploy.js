const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of AAVenture Recovery Suite...");

  // 1. Deploy RecoveryToken
  const RecoveryToken = await hre.ethers.getContractFactory("RecoveryToken");
  const token = await RecoveryToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✅ RecoveryToken deployed to: ${tokenAddress}`);

  // 2. Deploy RecoveryPassport
  const RecoveryPassport = await hre.ethers.getContractFactory("RecoveryPassport");
  const passport = await RecoveryPassport.deploy();
  await passport.waitForDeployment();
  const passportAddress = await passport.getAddress();
  console.log(`✅ RecoveryPassport deployed to: ${passportAddress}`);

  // 3. Deploy RecoveryDAO
  // Note: RecoveryDAO requires the token address for governance
  const RecoveryDAO = await hre.ethers.getContractFactory("RecoveryDAO");
  const dao = await RecoveryDAO.deploy(tokenAddress);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log(`✅ RecoveryDAO deployed to: ${daoAddress}`);

  console.log("\n--- Deployment Summary ---");
  console.log(`RECOVERY_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`PASSPORT_CONTRACT_ADDRESS=${passportAddress}`);
  console.log(`RECOVERY_DAO_ADDRESS=${daoAddress}`);
  console.log("---------------------------\n");

  console.log("Next steps: Update your .env file with these addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
