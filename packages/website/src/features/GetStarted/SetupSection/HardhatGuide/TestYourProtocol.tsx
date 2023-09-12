import { CodePreview } from '@/components/CodePreview';
import { Heading, Text } from '@chakra-ui/react';
import { Link as ChakraLink } from '@chakra-ui/react';

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
      <Heading size="md" mb={3} mt={8}>
        Test Your Protocol
      </Heading>
      <Text mb={4}>
        You can use the build task in your tests and optionally use the
        built-in&nbsp;
        <ChakraLink isExternal href="https://github.com/dethcrypto/TypeChain">
          TypeChain
        </ChakraLink>
        &nbsp; support. Here&apos;s an example from the&nbsp;
        <ChakraLink
          isExternal
          href="https://github.com/usecannon/cannon/tree/main/packages/sample-hardhat-project"
        >
          Hardhat sample project
        </ChakraLink>
        :
      </Text>
      <CodePreview code={code} language="javascript" />
    </>
  );
};
