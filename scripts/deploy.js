import hre from "hardhat";

async function main() {
  console.log("Deploying DigitalWillLedger to Polygon Amoy...");

  const networkName = hre.network.name || "amoy";
  const connection = await hre.network.getOrCreate(networkName);
  const { ethers } = connection;

  const DigitalWillLedger = await ethers.getContractFactory("DigitalWillLedger");
  const contract = await DigitalWillLedger.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ DigitalWillLedger deployed successfully!`);
  console.log(`   Contract Address: ${address}`);
  console.log(`   Network: Polygon Amoy Testnet (Chain ID: 80002)`);
  console.log(`   Explorer: https://amoy.polygonscan.com/address/${address}`);
  console.log(`\n📋 Add this to your .env file:`);
  console.log(`   POLYGON_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
