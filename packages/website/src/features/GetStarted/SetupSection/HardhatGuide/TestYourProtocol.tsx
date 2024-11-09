import { CodePreview } from '@/components/CodePreview';
import { ExternalLink } from 'lucide-react';

const code = `import { expect } from 'chai';
import { Contract } from 'ethers';
import hre from 'hardhat';
import { Greeter } from '../typechain';

describe('Greeter', function () {
  let Greeter: Greeter;

  before('load', async function () {
    const { outputs, signers } = await hre.run('cannon:build');
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
});`;

export const TestYourProtocol = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">Test Your Protocol</h2>
      <p className="mb-4">
        You can use the build task in your tests and optionally use the built-in{' '}
        <a
          href="https://github.com/dethcrypto/TypeChain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/90 inline-flex items-center gap-1"
        >
          TypeChain
          <ExternalLink className="h-3 w-3" />
        </a>{' '}
        support. Here&apos;s an example from the{' '}
        <a
          href="https://github.com/usecannon/cannon/tree/main/packages/sample-hardhat-project"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/90 inline-flex items-center gap-1"
        >
          Hardhat sample project
          <ExternalLink className="h-3 w-3" />
        </a>
        :
      </p>
      <CodePreview code={code} language="javascript" />
    </>
  );
};
