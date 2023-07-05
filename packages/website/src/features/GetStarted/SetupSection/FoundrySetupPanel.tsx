import { externalLinks } from '@/constants/externalLinks';
import { SetupCustomAlert } from './SetupCustomAlert';
import { Heading, Text } from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';

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

export const FoundrySetupPanel = () => {
  return (
    <>
      <SetupCustomAlert
        label="Foundry sample project"
        href={externalLinks.FOUNDRY_EXAMPLE}
      />
      <Heading as="h2" size="md" mt={16} mb={4}>
        👩‍💻 Create a Cannonfile
      </Heading>
      <Text>
        Create a new Foundry project with forge init sample-project. This will
        generate the following contract:
      </Text>
      <CodePreview code={code1} language="solidity" />
    </>
  );
};
