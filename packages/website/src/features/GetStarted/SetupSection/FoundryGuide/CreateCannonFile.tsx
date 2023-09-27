import { Box, Code, Heading, Text } from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';

const code1 = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }
}`;

const code2 = `name = "sample-foundry-project"
version = "0.1"
description = "Sample Foundry Project"

[setting.number]
defaultValue = "420"
description="Initialization value for the number"

[contract.counter]
artifact = "Counter"

[invoke.set_number]
target = ["counter"]
func = "setNumber"
args = ["<%= settings.number %>"]`;

export const CreateCannonFile = () => {
  return (
    <>
      <Heading size="md" mb={3} mt={8}>
        Create a Cannonfile
      </Heading>
      <Text mb={4}>
        Create a new Foundry project with <Code>forge init sample-project</Code>
        . This will generate the following contract:
      </Text>
      <Box mb={4}>
        <CodePreview code={code1} language="solidity" />
      </Box>
      <Text mb={4}>
        Create a cannonfile.toml in the root directory of the project with the
        following contents. If you plan to publish this package, you should
        customize the name. This will deploy the contract and set the number to
        420:
      </Text>
      <Box mb={4}>
        <CodePreview code={code2} language="toml" />
      </Box>
      <Text mb={4}>
        Now build the cannonfile for local development and testing:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon build" />
      </Box>
      <Text mb={4}>
        This created a local deployment of your nascent protocol. You can now
        run this package locally using the command-line tool. (Here, we add the{' '}
        <Code>--registry-priority local</Code> option to ensure we’re using the
        version of this package that you just built, regardless of what others
        have published.)
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon sample-foundry-project --registry-priority local" />
      </Box>
    </>
  );
};
