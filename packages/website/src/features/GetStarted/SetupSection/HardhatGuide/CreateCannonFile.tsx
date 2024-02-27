import { Box, Code, Heading, Link, Text } from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';

const code1 = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}`;

const code2 = `name = "sample-hardhat-project"
version = "0.1"
description = "Sample Hardhat Project"

[setting.unlock_time]
defaultValue = "1700000000"
description="Initialization value for the unlock time"

[contract.lock]
artifact = "Lock"
args = ["<%= settings.unlock_time %>"]`;

export const CreateCannonFile = () => {
  return (
    <>
      <Heading size="md" mb={3} mt={8}>
        Create a Cannonfile
      </Heading>
      <Text mb={4}>
        Create a new Hardhat project by following the instructions{' '}
        <Link href="https://hardhat.org/tutorial/creating-a-new-hardhat-project">
          here
        </Link>
        . Then install the Hardhat Cannon plug-in:
      </Text>
      <Box mb={4}>
        <CommandPreview command="npm install hardhat-cannon" />
      </Box>
      <Text mb={4}>
        Load the plug-in at the top of your hardhat.config.js file with{' '}
        <Code colorScheme="blackAlpha" variant="solid">
          {"require('hardhat-cannon');"}
        </Code>
        &nbsp;or&nbsp;
        <Code colorScheme="blackAlpha" variant="solid">
          {"import 'hardhat-cannon';"}
        </Code>
        &nbsp;if you&apos;re using Typescript.
      </Text>
      <Text mb={4}>
        In the configuration file, set the default network like so:{' '}
        <Code colorScheme="blackAlpha" variant="solid">
          {'defaultNetwork: "cannon"'}
        </Code>
      </Text>
      <Text mb={4}>Your project should have the following contract:</Text>
      <Box mb={4}>
        <CodePreview code={code1} language="sol" />
      </Box>
      <Text mb={4}>
        Create a cannonfile.toml in the root directory of the project with the
        following contents. If you plan to publish this package, you should
        customize the name. This will deploy the contract and set the unlock
        time to 1700000000:
      </Text>
      <Box mb={4}>
        <CodePreview code={code2} language="ini" />
      </Box>
      <Text mb={4}>
        Now build the cannonfile for local development and testing:
      </Text>
      <Box mb={4}>
        <CommandPreview command="npx hardhat cannon:build" />
      </Box>
      <Text mb={4}>
        This compiled your code and created a local deployment of your nascent
        protocol. You can now run this package locally using the command-line
        tool. (Here, we add the <Code>--registry-priority local</Code> option to
        ensure we’re using the version of this package that you just built,
        regardless of what others have published.)
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon sample-hardhat-project --registry-priority local" />
      </Box>
    </>
  );
};
