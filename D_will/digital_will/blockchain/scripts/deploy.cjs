const hre = require("hardhat");

async function main() {

  const beneficiary = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const asset = "Family House";

  const DigitalWill = await hre.ethers.getContractFactory("DigitalWill");

  const will = await DigitalWill.deploy(beneficiary, asset);

  await will.waitForDeployment();

  console.log("DigitalWill deployed to:", await will.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});