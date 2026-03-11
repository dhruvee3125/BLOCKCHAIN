// Deployment script for full blockchain DigitalWill contract
// Run: npx hardhat run scripts/deploy_full_blockchain.cjs --network localhost

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("\n🚀 Starting Deployment of Full Blockchain DigitalWill Contract...\n");

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log(`📍 Deploying from account: ${deployer.address}`);
    
    try {
        const balance = await deployer.getBalance();
        console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH\n`);
    } catch (e) {
        console.log(`💰 Account balance: (unable to fetch)\n`);
    }

    // Set treasury address (can be deployer)
    const treasuryAddress = deployer.address;
    console.log(`👛 Treasury Address: ${treasuryAddress}`);

    // Deploy contract
    try {
        console.log("\n⏳ Deploying DigitalWill contract...");
        
        const DigitalWill = await ethers.getContractFactory("contracts/DigitalWill_Full_Blockchain.sol:DigitalWill");
        const digitalWill = await DigitalWill.deploy(treasuryAddress);

        // Wait for deployment to be mined
        await digitalWill.deploymentTransaction().wait(1);

        console.log(`\n✅ DigitalWill deployed successfully!`);
        console.log(`📋 Contract Address: ${digitalWill.target}`);

        // Grant admin role to deployer
        const ADMIN_ROLE = await digitalWill.ADMIN_ROLE();
        const LEGAL_ADVISOR_ROLE = await digitalWill.LEGAL_ADVISOR_ROLE();
        const EMERGENCY_CONTACT_ROLE = await digitalWill.EMERGENCY_CONTACT_ROLE();
        const ARBITER_ROLE = await digitalWill.ARBITER_ROLE();

        console.log("\n🔐 Granting roles...");
        
        let tx = await digitalWill.grantRole(ADMIN_ROLE, deployer.address);
        await tx.wait();
        console.log("   ✅ Admin role granted");

        // Save deployment info
        const deploymentInfo = {
            contractAddress: digitalWill.target,
            deployerAddress: deployer.address,
            treasuryAddress: treasuryAddress,
            adminRole: ADMIN_ROLE.toString(),
            legalAdvisorRole: LEGAL_ADVISOR_ROLE.toString(),
            emergencyContactRole: EMERGENCY_CONTACT_ROLE.toString(),
            arbiterRole: ARBITER_ROLE.toString(),
            deploymentBlock: Number(await ethers.provider.getBlockNumber()),
            deploymentTime: new Date().toISOString(),
            network: hre.network.name,
            chainId: Number((await ethers.provider.getNetwork()).chainId)
        };

        console.log("\n\n═══════════════════════════════════════════════════════════════");
        console.log("✨ DEPLOYMENT SUCCESSFUL! ✨");
        console.log("═══════════════════════════════════════════════════════════════\n");
        
        console.log("📋 DEPLOYMENT INFO:\n");
        console.log(JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n\n🚀 NEXT STEPS:\n");
        console.log("1. Save this deployment address in your .env file:");
        console.log(`   REACT_APP_CONTRACT_ADDRESS=${digitalWill.target}\n`);
        
        console.log("2. Update frontend with new contract address\n");
        
        console.log("3. Run tests:");
        console.log("   npx hardhat test test/DigitalWill_Full.test.js\n");
        
        console.log("4. Register users:");
        console.log("   - Owner role (1): For will creators");
        console.log("   - Beneficiary role (2): For asset recipients");
        console.log("   - Legal Advisor (3): Register via admin\n");
        
        console.log("5. Create a will and go through the workflow:\n");
        console.log("   a. Owner creates will");
        console.log("   b. Owner requests verification from legal advisor");
        console.log("   c. Legal advisor approves");
        console.log("   d. Admin approves and releases to execution");
        console.log("   e. Conditions are checked (automated via Chainlink)");
        console.log("   f. When conditions met, beneficiary can claim\n");
        
        console.log("═══════════════════════════════════════════════════════════════\n");

        // Save to file
        const fs = require('fs');
        fs.writeFileSync(
            'deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("✅ Deployment info saved to deployment.json\n");

        return digitalWill;

    } catch (error) {
        console.error("\n❌ Deployment failed!");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("🎉 Script completed successfully!\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
