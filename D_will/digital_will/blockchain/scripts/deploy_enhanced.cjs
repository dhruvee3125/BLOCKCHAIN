// Deploy Enhanced Smart Contracts

const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying Enhanced Digital Will Smart Contracts...\n");

    try {
        // Get signers
        const [owner, beneficiary, other] = await ethers.getSigners();
        console.log("📍 Deploying with account:", owner.address);
        console.log("   Owner balance:", ethers.formatEther(await owner.provider.getBalance(owner.address)), "ETH\n");

        // ====================
        // 1. Deploy Factory
        // ====================
        console.log("📦 Deploying DigitalWillFactory...");
        const DigitalWillFactory = await hre.ethers.getContractFactory("DigitalWillFactory");
        const factory = await DigitalWillFactory.deploy();
        await factory.deployed();
        console.log("✅ Factory deployed at:", factory.address);

        // ====================
        // 2. Deploy Enhanced Will (direct)
        // ====================
        console.log("\n📦 Deploying Enhanced DigitalWill...");
        const DigitalWillEnhanced = await hre.ethers.getContractFactory("DigitalWill");
        const lockPeriod = 0; // No lock period for testing (in seconds)
        const enhanced = await DigitalWillEnhanced.deploy(
            owner.address,
            beneficiary.address,
            "Family House & Bank Accounts",
            lockPeriod
        );
        await enhanced.deployed();
        console.log("✅ Enhanced will deployed at:", enhanced.address);

        // ====================
        // 3. Deploy via Factory
        // ====================
        console.log("\n📦 Creating will via Factory...");
        const tx = await factory.createWill(
            beneficiary.address,
            "Ancestral Property & Investments",
            0
        );
        const receipt = await tx.wait();
        
        // Get the new will address from events
        const newWillAddress = receipt.events.find(e => e.event === "WillCreated").args.will;
        console.log("✅ Will created via factory at:", newWillAddress);

        // ====================
        // 4. Test Functionality
        // ====================
        console.log("\n🧪 Testing Smart Contract Functions...\n");

        // Test Enhanced Will
        console.log("Testing Enhanced Will Contract:");
        const details = await enhanced.getWillDetails();
        console.log("  Owner:", details.willOwner);
        console.log("  Beneficiary:", details.willBeneficiary);
        console.log("  Asset:", details.willAsset);
        console.log("  Lock Period:", details.willLockPeriod.toString(), "seconds");

        // Execute will
        console.log("\n  Executing will...");
        const execTx = await enhanced.executeWill();
        await execTx.wait();
        console.log("  ✅ Will executed!");

        // Check status
        const status = await enhanced.getWillStatus();
        console.log("  Status:", {
            executed: status.isExecuted,
            claimed: status.isClaimed,
            canClaim: status.canClaim
        });

        // Claim asset
        console.log("\n  Claiming asset as beneficiary...");
        const claimedAsset = await enhanced.connect(beneficiary).claimAsset();
        console.log("  ✅ Asset claimed:", claimedAsset);

        // ====================
        // 5. Save Deployment Info
        // ====================
        const deploymentInfo = {
            timestamp: new Date().toISOString(),
            network: "Hardhat Local",
            contracts: {
                factory: {
                    name: "DigitalWillFactory",
                    address: factory.address,
                    description: "Factory to create multiple digital wills"
                },
                enhancedWill: {
                    name: "DigitalWill (Enhanced)",
                    address: enhanced.address,
                    description: "Individual will with time-lock and events",
                    owner: owner.address,
                    beneficiary: beneficiary.address,
                    asset: "Family House & Bank Accounts"
                },
                factoryCreatedWill: {
                    name: "DigitalWill via Factory",
                    address: newWillAddress,
                    description: "Will created through factory",
                    beneficiary: beneficiary.address,
                    asset: "Ancestral Property & Investments"
                }
            },
            testAccounts: {
                owner: owner.address,
                beneficiary: beneficiary.address,
                other: other.address
            }
        };

        const deploymentPath = "./deployments_enhanced.json";
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log("\n📄 Deployment info saved to:", deploymentPath);

        // ====================
        // 6. Summary
        // ====================
        console.log("\n" + "=".repeat(60));
        console.log("✨ DEPLOYMENT SUMMARY");
        console.log("=".repeat(60));
        console.log("\n📦 Contracts Deployed:");
        console.log("  1. DigitalWillFactory:", factory.address);
        console.log("  2. Enhanced DigitalWill:", enhanced.address);
        console.log("  3. Factory-Created Will:", newWillAddress);
        console.log("\n🧪 All tests passed successfully!");
        console.log("=".repeat(60));

    } catch (error) {
        console.error("❌ Deployment Error:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
