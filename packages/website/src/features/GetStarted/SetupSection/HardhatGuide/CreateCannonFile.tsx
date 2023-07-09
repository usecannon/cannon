import { Heading, Link, Text } from '@chakra-ui/react';
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
args = ["<%= settings.number %>"]
depends = ["contract.counter"]`;

export const CreateCannonFile = () => {
  return (
    <>
      <Heading as="h2" size="md" mt={16} mb={4}>
        👩‍💻 Create a Cannonfile
      </Heading>
      <Text>
        Create a new Hardhat project by following the instructions{' '}
        <Link href="https://hardhat.org/tutorial/creating-a-new-hardhat-project">
          here
        </Link>
        .
      </Text>
      <Text mt={4}>Then install the Hardhat Cannon plug-in:</Text>
      <CommandPreview command="npm install hardhat-cannon" />
      <CodePreview code={code1} language="solidity" />
      <Text mt={4}>
        Create a cannonfile.toml in the root directory of the project with the
        following contents. If you plan to publish this package, you should
        customize the name. This will deploy the contract and set the number to
        420:
      </Text>
      <CodePreview code={code2} language="toml" />
      <Text mt={4}>
        Now build the cannonfile for local development and testing:
      </Text>
      <CommandPreview command="cannon build" />
      <Text mt={4}>
        This created a local deployment of your nascent protocol. You can now
        run this package locally using the command-line tool:
      </Text>
      <CommandPreview command="cannon sample-foundry-project" />
    </>
  );
};
