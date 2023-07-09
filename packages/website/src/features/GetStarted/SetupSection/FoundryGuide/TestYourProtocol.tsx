import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';
import { Heading, Text, Code } from '@chakra-ui/react';
import React from 'react';

const code = `pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "cannon-std/Cannon.sol";

import "../src/SampleIntegration.sol";

contract SampleIntegrationTest is Test {
    using Cannon for Vm;

    SampleIntegration sampleIntegration;

    function setUp() public {
        sampleIntegration = SampleIntegration(vm.getAddress("SampleIntegration"));
    }

    function testFailSetThresholdRequiresOwner() public {
        vm.expectRevert();
        sampleIntegration.setThreshold(3);
    }
}`;

export const TestYourProtocol = () => {
  return (
    <>
      <Heading as="h2" size="md" mt={16} mb={4}>
        🧪 Test Your Protocol
      </Heading>
      <Text>Install Cannon for Foundry:</Text>
      <CommandPreview command="forge install usecannon/cannon-std" />
      <Text mt={8} mb={4}>
        Grant your Foundry project permission to read from the filesystem. Add
        the following line to your
        <Code colorScheme="blackAlpha" variant="solid">
          foundry.toml
        </Code>
        &nbsp; file:
      </Text>
      <CommandPreview command='fs_permissions = [{ access = "read", path = "./"}]' />
      <Text mt={8} mb={4}>
        Include the Cannon.sol library in your tests. Here’s an example:
      </Text>
      <CodePreview code={code} language="toml" />
      <Text mt={8} mb={4}>
        Use the test command to run them. (Note that the&nbsp;
        <Code colorScheme="blackAlpha" variant="solid">
          -chain-id
        </Code>
        &nbsp; - option can be used to run tests against a forked network.)
      </Text>
      <CommandPreview command="npx cannon test" />
    </>
  );
};
