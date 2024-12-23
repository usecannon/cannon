import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';

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
      <h2 className="text-xl font-semibold mb-3 mt-8">Test Your Protocol</h2>
      <p className="mb-4">Install Cannon for Foundry:</p>
      <div className="mb-4">
        <CommandPreview command="forge install usecannon/cannon-std" />
      </div>
      <p className="mb-4">
        Grant your Foundry project permission to read from the filesystem. Add
        the following line to your{' '}
        <code className="bg-secondary px-1.5 py-0.5 rounded-md font-mono text-sm">
          foundry.toml
        </code>
        &nbsp; file:
      </p>
      <div className="mb-4">
        <CommandPreview command='fs_permissions = [{ access = "read", path = "./"}]' />
      </div>
      <p className="mb-4">
        Include the Cannon.sol library in your tests. Here&apos;s an example:
      </p>
      <div className="mb-4">
        <CodePreview code={code} language="sol" />
      </div>
      <p className="mb-4">
        Use the test command to run them. (Note that the&nbsp;
        <code className="bg-secondary px-1.5 py-0.5 rounded-md font-mono text-sm">
          --chain-id
        </code>{' '}
        option can be used to run tests against a forked network.)
      </p>
      <CommandPreview command="npx cannon test" />
    </>
  );
};
