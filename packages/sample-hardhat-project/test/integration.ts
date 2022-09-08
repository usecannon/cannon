import hre, { ethers } from 'hardhat';

async function doTest() {
    const rawResult = await hre.run('cannon:build');
    const { provider, signers, outputs } = rawResult;

    const signer1 = signers[0];

    const contract = new ethers.Contract(outputs.contracts.greeter.address, outputs.contracts.greeter.abi, provider.getSigner(signer1.address));

    try {
        await contract.doCloning();
    } catch(err) {
        console.error('got error:', await err);
    }
}

doTest();