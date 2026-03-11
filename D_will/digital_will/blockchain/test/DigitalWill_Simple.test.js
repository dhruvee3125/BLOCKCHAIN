const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalWill - Core Functions", function () {
    let digitalWill;
    let owner, beneficiary, legalAdvisor, admin;
    const OWNER_ROLE = 1;
    const BENEFICIARY_ROLE = 2;
    const MANUAL_APPROVAL = 0;

    beforeEach(async function () {
        [owner, beneficiary, legalAdvisor, admin] = await ethers.getSigners();

        const DigitalWill = await ethers.getContractFactory("contracts/DigitalWill_Full_Blockchain.sol:DigitalWill");
        digitalWill = await DigitalWill.deploy(admin.address);
        
        await digitalWill.deploymentTransaction().wait(1);
        
        const ADMIN_ROLE = await digitalWill.ADMIN_ROLE();
        await digitalWill.grantRole(ADMIN_ROLE, admin.address);
    });

    describe("User Registration", function () {
        it("✅ Should register owner", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            const user = await digitalWill.getUser(owner.address);
            expect(user.isActive).to.be.true;
        });

        it("✅ Should register beneficiary", async function () {
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
            const user = await digitalWill.getUser(beneficiary.address);
            expect(user.isActive).to.be.true;
        });

        it("✅ Should reject duplicate registration", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await expect(
                digitalWill.connect(owner).registerUser(OWNER_ROLE)
            ).to.be.revertedWith("Already registered");
        });
    });

    describe("Will Creation & Management", function () {
        beforeEach(async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(beneficiary).registerUser(BENEFICIARY_ROLE);
        });

        it("✅ Should create will", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const tx = await digitalWill.connect(owner).createWill(
                beneficiary.address,
                willHash,
                "QmTest",
                365 * 24 * 60 * 60,
                ethers.parseEther("1.0")
            );
            
            await tx.wait();
            const userWills = await digitalWill.getUserWills(owner.address);
            expect(userWills.length).to.be.greaterThan(0);
        });

        it("✅ Should get user wills", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            await digitalWill.connect(owner).createWill(
                beneficiary.address,
                willHash,
                "QmTest",
                365 * 24 * 60 * 60,
                ethers.parseEther("1.0")
            );
            
            const wills = await digitalWill.getUserWills(owner.address);
            expect(wills.length).to.equal(1);
        });

        it("✅ Should get beneficiary wills", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            await digitalWill.connect(owner).createWill(
                beneficiary.address,
                willHash,
                "QmTest",
                365 * 24 * 60 * 60,
                ethers.parseEther("1.0")
            );
            
            const wills = await digitalWill.getBeneficiaryWills(beneficiary.address);
            expect(wills.length).to.equal(1);
        });
    });

    describe("Access Control", function () {
        it("✅ Should reject unregistered user", async function () {
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            await expect(
                digitalWill.connect(owner).createWill(
                    beneficiary.address,
                    willHash,
                    "QmTest",
                    365 * 24 * 60 * 60,
                    ethers.parseEther("1.0")
                )
            ).to.be.revertedWith("User not registered");
        });

        it("✅ Should reject self as beneficiary", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            const willHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            
            await expect(
                digitalWill.connect(owner).createWill(
                    owner.address,
                    willHash,
                    "QmTest",
                    365 * 24 * 60 * 60,
                    ethers.parseEther("1.0")
                )
            ).to.be.revertedWith("Cannot be own beneficiary");
        });
    });

    describe("User Activity", function () {
        it("✅ Should track last login", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            const before = await digitalWill.daysSinceLastLogin(owner.address);
            expect(Number(before)).to.be.lte(1);
        });

        it("✅ Should update activity on login", async function () {
            await digitalWill.connect(owner).registerUser(OWNER_ROLE);
            await digitalWill.connect(owner).logUserActivity();
            const days = await digitalWill.daysSinceLastLogin(owner.address);
            expect(Number(days)).to.equal(0);
        });
    });
});
