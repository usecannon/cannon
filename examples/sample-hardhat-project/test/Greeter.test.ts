import { expect } from 'chai';
import hre from 'hardhat';
import { Greeter } from '../typechain';

describe('Greeter', function () {
  let Greeter: Greeter;

  before('load', async function () {
    const contractInfo: {address: string, abi: Array<Object>} = await hre.cannon.getContract('Greeter');
    Greeter = (await hre.ethers.getContractAt('Greeter', contractInfo.address)) as Greeter;
  });

  it('Should return the new greeting once it is changed', async function () {
    expect(await Greeter.greet()).to.equal('Hello world!');

    const setGreetingTx = await Greeter.setGreeting('Hola mundo!');

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await Greeter.greet()).to.equal('Hola mundo!');
  });
});
