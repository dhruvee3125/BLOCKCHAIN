const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalWill - Full Blockchain Implementation", function () {
    let digitalWill;
    let owner, beneficiary, legalAdvisor, admin, emergencyContact, arbiter;
    let ownerAddress, beneficiaryAddress, advisorAddress, adminAddress;

    // Constants matching contract
    const OWNER_ROLE = 1;
    const BENEFICIARY_ROLE = 2;
    const LEGAL_ADVISOR_ROLE = 3;
    const ADMIN_ROLE = 4;
    const EMERGENCY_CONTACT_ROLE = 5;
    const ARBITER_ROLE = 6;

    // Will Status
    const CREATED = 0;
    const PENDING_VERIFICATION = 1;
    const PENDING_ADMIN_APPROVAL = 2;
    const VERIFIED = 3;
    const PENDING_EXECUTION = 4;
    const EXECUTABLE = 5;
    const CLAIMED = 6;
    const REJECTED = 7;
    const DISPUTED = 8;

    // Condition Types
    const MANUAL_APPROVAL = 0;
    const NO_LOGIN_DAYS = 1;
    const SPECIFIC_DATE = 2;
    const ON_DEATH = 3;

    // Helper to extract willId from transaction receipt
    async function getWillIdFromTx(tx) {
        const receipt = await tx.wait();
        const iface = digitalWill.interface;
        for (const log of receipt.logs) {
            try {
                const event = iface.parseLog(log);
                if (event && event.args && event.args.wellId) {
                    return event.args.wellId;
                }
            } catch (e) {
                // Not a WillCreated event, continue
            }
        }
        throw new Error('WillCreated event not found');
    }

    beforeEach(async function () {
        [owner, beneficiary, legalAdvisor, admin, emergencyContact, arbiter] = await ethers.getSigners();
        
        ownerAddress = owner.address;
        beneficiaryAddress = beneficiary.address;
        advisorAddress = legalAdvisor.address;
        adminAddress = admin.address;

        // Deploy contract
        const DigitalWill = await ethers.getContractFactory("contracts/DigitalWill_Full_Blockchain.sol:DigitalWill");
        digitalWill = await DigitalWill.deploy(admin.address);
        
        // Wait for deployment
        await digitalWill.deploymentTransaction().wait(1);

        console.log("✅ Contract deployed at:", digitalWill.target);

        // Grant admin privileges
        const DEFAULT_ADMIN_ROLE = await digitalWill.DEFAULT_ADMIN_ROLE();
        const ADMIN_ROLE_HASH = await digitalWill.ADMIN_ROLE();
        const LEGAL_ADVISOR_ROLE_HASH = await digitalWill.LEGAL_ADVISOR_ROLE();
        const EMERGENCY_CONTACT_ROLE_HASH = await digitalWill.EMERGENCY_CONTACT_ROLE();
        const ARBITER_ROLE_HASH = await digitalWill.ARBITER_ROLE();

        // First, grant DEFAULT_ADMIN_ROLE to deployer so they can grant other roles
        // Then grant roles to test accounts  
        await digitalWill.grantRole(DEFAULT_ADMIN_ROLE, admin.address);
        await digitalWill.connect(admin).grantRole(ADMIN_ROLE_HASH, admin.address);
        await digitalWill.connect(admin).grantRole(LEGAL_ADVISOR_ROLE_HASH, legalAdvisor.address);
        await digitalWill.connect(admin).grantRole(EMERGENCY_CONTACT_ROLE_HASH, emergencyContact.address);
        await digitalWill.connect(admin).grantRole(ARBITER_ROLE_HASH, arbiter.address);
    });

    // ===== USER MANAGEMENT TESTS =====

    describe("User Management", function () {
        it("Should register owner user", async function () {
            const tx = await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            
            // Just check that event was emitted
            await expect(tx).to.emit(digitalWill, "UserRegistered");

            const user = await digitalWill.getUser(ownerAddress);
            expect(user.isActive).to.be.true;
            expect(user.role).to.equal(OWNER_ROLE);
        });

        it("Should register beneficiary user", async function () {
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            
            const user = await digitalWill.getUser(beneficiaryAddress);
            expect(user.isActive).to.be.true;
            expect(user.role).to.equal(BENEFICIARY_ROLE);
        });

        it("Should not allow duplicate registration", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            
            await expect(
                digitalWill.connect(owner).registerUser(OWNER_ROLE)
            ).to.be.revertedWith("Already registered");
        });

        it("Should update user activity on login", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            
            const userBefore = await digitalWill.getUser(ownerAddress);
            const loginTimeBefore = userBefore.lastLogin;

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));

            // Log activity
            await digitalWill.connect(owner).logUserActivity();

            const userAfter = await digitalWill.getUser(ownerAddress);
            expect(userAfter.lastLogin).to.be.greaterThan(loginTimeBefore);
        });

        it("Should register legal advisor (admin only)", async function () {
            await digitalWill.connect(legalAdvisor).registerUser(LEGAL_ADVISOR_ROLE);
            
            const tx = await digitalWill.connect(admin).registerLegalAdvisor(advisorAddress);
            
            const user = await digitalWill.getUser(advisorAddress);
            expect(user.role).to.equal(LEGAL_ADVISOR_ROLE);
        });
    });

    // ===== WILL CREATION TESTS =====

    describe("Will Creation", function () {
        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
        });

        it("Should create will successfully", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60; // 1 year
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const willId = await getWillIdFromTx(tx);

            const will = await digitalWill.getWill(willId);
            expect(will.owner).to.equal(ownerAddress);
            expect(will.beneficiary).to.equal(beneficiaryAddress);
            expect(will.status).to.equal(CREATED);
        });

        it("Should not allow non-registered user to create will", async function () {
            const unregistered = (await ethers.getSigners())[6];
            
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const ipfsCID = "QmTest";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            await expect(
                digitalWill.connect(unregistered).createWill(
                    beneficiaryAddress,
                    willHash,
                    ipfsCID,
                    lockTime,
                    assetValue
                )
            ).to.be.revertedWith("User not registered");
        });

        it("Should not allow owner as own beneficiary", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const ipfsCID = "QmTest";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            await expect(
                digitalWill.connect(owner).createWill(
                    ownerAddress, // self as beneficiary
                    willHash,
                    ipfsCID,
                    lockTime,
                    assetValue
                )
            ).to.be.revertedWith("Cannot be own beneficiary");
        });

        it("Should validate lock time", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const ipfsCID = "QmTest";
            const assetValue = ethers.parseEther("1.0");

            // Too short lock time
            await expect(
                digitalWill.connect(owner).createWill(
                    beneficiaryAddress,
                    willHash,
                    ipfsCID,
                    1, // 1 second < 30 days
                    assetValue
                )
            ).to.be.revertedWith("Lock time invalid");
        });
    });

    // ===== CONDITION TESTS =====

    describe("Condition Management", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;
        });

        it("Should add NO_LOGIN_DAYS condition", async function () {
            const conditionValue = 365 * 24 * 60 * 60; // 365 days in seconds

            const tx = await digitalWill.connect(owner).addCondition(
                willId,
                NO_LOGIN_DAYS,
                conditionValue,
                "Owner inactive for 365 days"
            );

            await expect(tx).to.emit(digitalWill, "ConditionCreated");

            const will = await digitalWill.getWill(willId);
            expect(will.conditionIds.length).to.equal(1);
        });

        it("Should add SPECIFIC_DATE condition", async function () {
            const futureDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

            await digitalWill.connect(owner).addCondition(
                willId,
                SPECIFIC_DATE,
                futureDate,
                "Will executable on specific date"
            );

            const will = await digitalWill.getWill(willId);
            expect(will.conditionIds.length).to.equal(1);
        });

        it("Should retrieve all conditions for will", async function () {
            const conditionValue = 365 * 24 * 60 * 60;

            await digitalWill.connect(owner).addCondition(
                willId,
                NO_LOGIN_DAYS,
                conditionValue,
                ""
            );

            await digitalWill.connect(owner).addCondition(
                willId,
                MANUAL_APPROVAL,
                0,
                ""
            );

            const conditions = await digitalWill.getWillConditions(willId);
            expect(conditions.length).to.equal(2);
        });

        it("Should not allow non-owner to add condition", async function () {
            await expect(
                digitalWill.connect(beneficiary).addCondition(
                    willId,
                    NO_LOGIN_DAYS,
                    365 * 24 * 60 * 60,
                    ""
                )
            ).to.be.revertedWith("Only will owner");
        });
    });

    // ===== VERIFICATION WORKFLOW TESTS =====

    describe("Verification Workflow", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            await digitalWill.connect(legalAdvisor).registerUser(LEGAL_ADVISOR_ROLE);
            await digitalWill.connect(admin).registerLegalAdvisor(advisorAddress);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;
        });

        it("Should request verification", async function () {
            const tx = await digitalWill.connect(owner).requestVerification(
                willId,
                advisorAddress
            );

            await expect(tx).to.emit(digitalWill, "VerificationRequested");

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(PENDING_VERIFICATION);
        });

        it("Should allow legal advisor to approve", async function () {
            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("approved"));
            const tx = await digitalWill.connect(legalAdvisor).approveByLegalAdvisor(
                willId,
                willHash,
                "Will looks good to me"
            );

            await expect(tx).to.emit(digitalWill, "WillVerified");

            const will = await digitalWill.getWill(willId);
            expect(will.verified).to.be.true;
            expect(will.status).to.equal(PENDING_ADMIN_APPROVAL);
        });

        it("Should allow legal advisor to reject", async function () {
            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);

            const tx = await digitalWill.connect(legalAdvisor).rejectByLegalAdvisor(
                willId,
                "Will has legal issues"
            );

            await expect(tx).to.emit(digitalWill, "WillVerificationRejected");

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(REJECTED);
        });

        it("Should not allow non-advisor to verify", async function () {
            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

            await expect(
                digitalWill.connect(owner).approveByLegalAdvisor(
                    willId,
                    willHash,
                    "Approval"
                )
            ).to.be.revertedWith("Access Denied");
        });
    });

    // ===== ADMIN APPROVAL TESTS =====

    describe("Admin Approval", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            await digitalWill.connect(legalAdvisor).registerUser(LEGAL_ADVISOR_ROLE);
            await digitalWill.connect(admin).registerLegalAdvisor(advisorAddress);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;

            // Request and get verification
            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);
            
            const docHash = ethers.keccak256(ethers.toUtf8Bytes("docs"));
            await digitalWill.connect(legalAdvisor).approveByLegalAdvisor(
                willId,
                docHash,
                "Approved"
            );
        });

        it("Should allow admin to approve verified will", async function () {
            const tx = await digitalWill.connect(admin).approveByAdmin(
                willId,
                "Approved by admin",
                { value: ethers.parseEther("0.01") }
            );

            await expect(tx).to.emit(digitalWill, "AdminApproved");

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(VERIFIED);
            expect(will.adminApproved).to.be.true;
            expect(will.approvedBy).to.equal(adminAddress);
        });

        it("Should collect approval fee", async function () {
            const fee = ethers.parseEther("0.01");
            
            await digitalWill.connect(admin).approveByAdmin(
                willId,
                "Approved",
                { value: fee }
            );

            // Check contract balance
            const balance = await ethers.provider.getBalance(digitalWill.address);
            expect(balance).to.equal(fee);
        });

        it("Should allow admin to reject verified will", async function () {
            const tx = await digitalWill.connect(admin).rejectByAdmin(
                willId,
                "Does not meet criteria"
            );

            await expect(tx).to.emit(digitalWill, "AdminRejected");

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(REJECTED);
        });

        it("Should not allow non-admin to approve", async function () {
            await expect(
                digitalWill.connect(owner).approveByAdmin(
                    willId,
                    "Approved",
                    { value: ethers.parseEther("0.01") }
                )
            ).to.be.revertedWith("Access Denied");
        });
    });

    // ===== CONDITION CHECKING TESTS =====

    describe("Condition Checking", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            await digitalWill.connect(legalAdvisor).registerUser(LEGAL_ADVISOR_ROLE);
            await digitalWill.connect(admin).registerLegalAdvisor(advisorAddress);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;

            // Add MANUAL_APPROVAL condition
            await digitalWill.connect(owner).addCondition(
                willId,
                MANUAL_APPROVAL,
                0,
                ""
            );

            // Get verification and approval
            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);
            const docHash = ethers.keccak256(ethers.toUtf8Bytes("docs"));
            await digitalWill.connect(legalAdvisor).approveByLegalAdvisor(
                willId,
                docHash,
                "Approved"
            );

            await digitalWill.connect(admin).approveByAdmin(
                willId,
                "Approved",
                { value: ethers.parseEther("0.01") }
            );
        });

        it("Should check conditions and mark executable", async function () {
            const result = await digitalWill.checkAllConditions(willId);

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(EXECUTABLE);
        });

        it("Should check NO_LOGIN_DAYS condition", async function () {
            // Create new will with NO_LOGIN_DAYS
            const ownerSigner = owner;
            
            // First, advance time on blockchain
            await ethers.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]); // 366 days
            await ethers.provider.send("evm_mine");

            // Create will with NO_LOGIN_DAYS condition
            const willHash2 = ethers.keccak256(ethers.toUtf8Bytes("test will 2"));
            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash2,
                "QmTest2",
                365 * 24 * 60 * 60,
                ethers.parseEther("2.0")
            );

            const receipt = await tx.wait();
            const willId2 = receipt.events[0].args.willId;

            // Add condition
            await digitalWill.connect(owner).addCondition(
                willId2,
                NO_LOGIN_DAYS,
                365 * 24 * 60 * 60,
                ""
            );

            // Get approval
            await digitalWill.connect(owner).requestVerification(willId2, advisorAddress);
            const docHash = ethers.keccak256(ethers.toUtf8Bytes("docs"));
            await digitalWill.connect(legalAdvisor).approveByLegalAdvisor(
                willId2,
                docHash,
                "Approved"
            );

            await digitalWill.connect(admin).approveByAdmin(
                willId2,
                "Approved",
                { value: ethers.parseEther("0.01") }
            );

            // Check conditions
            const result = await digitalWill.checkAllConditions(willId2);
            
            const will = await digitalWill.getWill(willId2);
            // After 366 days, should be executable
            expect(will.status).to.equal(EXECUTABLE);
        });
    });

    // ===== ASSET CLAIMING TESTS =====

    describe("Asset Claiming", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            await digitalWill.connect(legalAdvisor).registerUser(LEGAL_ADVISOR_ROLE);
            await digitalWill.connect(admin).registerLegalAdvisor(advisorAddress);

            const assetValue = ethers.parseEther("1.0");
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;

            // Add condition and get approvals
            await digitalWill.connect(owner).addCondition(
                willId,
                MANUAL_APPROVAL,
                0,
                ""
            );

            await digitalWill.connect(owner).requestVerification(willId, advisorAddress);
            const docHash = ethers.keccak256(ethers.toUtf8Bytes("docs"));
            await digitalWill.connect(legalAdvisor).approveByLegalAdvisor(
                willId,
                docHash,
                "Approved"
            );

            // Send asset to contract
            await owner.sendTransaction({
                to: digitalWill.address,
                value: assetValue
            });

            await digitalWill.connect(admin).approveByAdmin(
                willId,
                "Approved",
                { value: ethers.parseEther("0.01") }
            );

            // Make executable
            await digitalWill.checkAllConditions(willId);
        });

        it("Should allow beneficiary to claim assets", async function () {
            const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiaryAddress);

            const tx = await digitalWill.connect(beneficiary).claimAssets(willId);

            await expect(tx).to.emit(digitalWill, "AssetClaimed");

            const will = await digitalWill.getWill(willId);
            expect(will.executed).to.be.true;
            expect(will.status).to.equal(CLAIMED);

            const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiaryAddress);
            expect(beneficiaryBalanceAfter).to.be.greaterThan(beneficiaryBalanceBefore);
        });

        it("Should not allow non-beneficiary to claim", async function () {
            await expect(
                digitalWill.connect(owner).claimAssets(willId)
            ).to.be.revertedWith("Only beneficiary");
        });

        it("Should not allow claiming twice", async function () {
            await digitalWill.connect(beneficiary).claimAssets(willId);

            await expect(
                digitalWill.connect(beneficiary).claimAssets(willId)
            ).to.be.revertedWith("Already claimed");
        });
    });

    // ===== EMERGENCY & DISPUTE TESTS =====

    describe("Emergency & Dispute Handling", function () {
        let willId;

        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            const tx = await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );

            const receipt = await tx.wait();
            willId = receipt.events[0].args.willId;
        });

        it("Should allow emergency contact to report death", async function () {
            // Add ON_DEATH condition
            await digitalWill.connect(owner).addCondition(
                willId,
                ON_DEATH,
                0,
                ""
            );

            // Report death
            const tx = await digitalWill.connect(emergencyContact).reportDeath(willId);

            await expect(tx).to.emit(digitalWill, "DeathCertificateSubmitted");
        });

        it("Should allow owner to file dispute", async function () {
            const tx = await digitalWill.connect(owner).fileDispute(
                willId,
                "Will data is incorrect"
            );

            await expect(tx).to.emit(digitalWill, "DisputeFiled");

            const will = await digitalWill.getWill(willId);
            expect(will.status).to.equal(DISPUTED);
        });

        it("Should allow beneficiary to file dispute", async function () {
            const tx = await digitalWill.connect(beneficiary).fileDispute(
                willId,
                "Forced will creation"
            );

            await expect(tx).to.emit(digitalWill, "DisputeFiled");
        });
    });

    // ===== VIEW FUNCTIONS TESTS =====

    describe("View Functions", function () {
        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);

            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test will"));
            const ipfsCID = "QmTest1234567890";
            const lockTime = 365 * 24 * 60 * 60;
            const assetValue = ethers.parseEther("1.0");

            await digitalWill.connect(owner).createWill(
                beneficiaryAddress,
                willHash,
                ipfsCID,
                lockTime,
                assetValue
            );
        });

        it("Should get user information", async function () {
            const user = await digitalWill.getUser(ownerAddress);
            expect(user.isActive).to.be.true;
            expect(user.role).to.equal(OWNER_ROLE);
        });

        it("Should get user wills", async function () {
            const userWills = await digitalWill.getUserWills(ownerAddress);
            expect(userWills.length).to.equal(1);
        });

        it("Should get beneficiary wills", async function () {
            const beneficiaryWills = await digitalWill.getBeneficiaryWills(beneficiaryAddress);
            expect(beneficiaryWills.length).to.equal(1);
        });

        it("Should calculate days since last login", async function () {
            const daysSinceLogin = await digitalWill.daysSinceLastLogin(ownerAddress);
            expect(daysSinceLogin).to.equal(0); // Just logged in
        });
    });
});

