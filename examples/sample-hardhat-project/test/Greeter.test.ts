import { expect } from 'chai';
import { Contract } from 'ethers';
import hre from 'hardhat';
import { Greeter } from '../typechain';

describe('Greeter', function () {
  let Greeter: Greeter;

  before('load', async function () {
    const { outputs, signers } = await hre.run('cannon:build', { ignorePkgrefCheck: 'true' });
    const { address, abi } = outputs.contracts.Greeter;
    Greeter = new Contract(address, abi, signers[0]) as Greeter;
  });

  it('Should return the new greeting once it is changed', async function () {
    expect(await Greeter.greet()).to.equal('Hello world!');

    const setGreetingTx = await Greeter.setGreeting('Hola mundo!');

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await Greeter.greet()).to.equal('Hola mundo!');
  });
});
