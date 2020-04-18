import {waffle} from "@nomiclabs/buidler";
import chai from "chai";
// import {deployContract, solidity} from "ethereum-waffle";
import {solidity} from "ethereum-waffle";
import {Wallet} from 'ethers';
const {createMockProvider, getWallets, deployContract } = require('@eth-optimism/rollup-full-node');

import ContributionsArtifact from "../artifacts/EthChicagoQF.json";
import {EthChicagoQF} from "../typechain/EthChicagoQF";
import CEMTokenArtifact from "../artifacts/CEMToken.json";
import {CEMToken} from "../typechain/CEMToken";

chai.use(solidity);
const {expect} = chai;

describe("CEMToken contract", () => {
    let adminWalletObject: Wallet;
    let projectWalletObject: Wallet;
    let backerWalletObject: Wallet;
    let approvedWalletObject: Wallet;

    let adminAddress: string;
    let backerAddress: string;
    let projectAddress: string;
    let approvedWalletAddress: string;

    let provider: any
    before(async () => {
        //const provider = waffle.provider;
        provider = await createMockProvider();

        ;[
            adminWalletObject,
            projectWalletObject,
            backerWalletObject,
            approvedWalletObject
        ] = getWallets(provider);

        adminAddress = adminWalletObject.address;
        backerAddress = backerWalletObject.address;
        projectAddress = projectWalletObject.address;
        approvedWalletAddress = approvedWalletObject.address;
        console.log({adminAddress});
        console.log({backerAddress});
        console.log({projectAddress});
        console.log({approvedWalletAddress});
    })

    after(() => {provider.closeOVM()});


    let cemTokenContract: CEMToken;
    let cemTokenContractAsBacker: CEMToken;
    let cemTokenContractAsApprovedSpender: CEMToken;

    // TODO: Use an address type rather than the more generic string
    let ethChicagoQFContractAddress: string;

    beforeEach(async () => {
        const initialSupply = 100;

        // Note: Initially the backer of the deploy tx has all of the initial supply
        cemTokenContract = (await deployContract(
            adminWalletObject,
            CEMTokenArtifact,
            [initialSupply]
        )) as CEMToken;

        // Get a reference to the CEMToken contract where the backer is
        // always a "meetup attendee"
        cemTokenContractAsBacker = cemTokenContract.connect(backerWalletObject);

        cemTokenContractAsApprovedSpender = cemTokenContract.connect(
            approvedWalletObject
        );

        const {address: cemTokenContractAddress} = cemTokenContract;
        console.log({cemTokenContractAddress});

        // Double-check that we set up:
        // (A) the initial token supply
        // and
        // (B) the balance of the admin account correctly
        const totalSupply = await cemTokenContract.totalSupply();
        expect(totalSupply).to.equal(initialSupply);
        const adminBalance = await cemTokenContract.balanceOf(adminAddress);
        expect(adminBalance).to.equal(initialSupply);

        // Give the backer account some tokens to transfer
        const backerInitialAmount = 20;
        await cemTokenContract.transfer(backerAddress, backerInitialAmount);
        const backerBalance = await cemTokenContract.balanceOf(backerAddress);
        expect(backerBalance).to.equal(backerInitialAmount);
        console.log({backerBalance});
    });

    it("should be able to spend approved CEMToken", async () => {
        const amount = 10;

        // Just using this to test balance error
        // Sender approves other wallet to test transferFrom directly

        await expect(
            cemTokenContractAsBacker.approve(approvedWalletAddress, amount)
        )
            .to.emit(cemTokenContractAsBacker, "Approval")
            .withArgs(backerAddress, approvedWalletAddress, amount);

        const approvedWalletAllowance = await cemTokenContractAsBacker.allowance(
            backerAddress,
            approvedWalletAddress
        );
        console.log({approvedWalletAllowance});
        expect(approvedWalletAllowance).to.equal(amount);

        console.log("About to do the transfer");
        // Owner is backer
        await cemTokenContractAsApprovedSpender.transferFrom(
            backerAddress,
            projectAddress,
            amount
        );
    });
});
