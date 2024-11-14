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

[var.main]
unlock_time = "1700000000"

[deploy.lock]
artifact = "Lock"
args = ["<%= settings.unlock_time %>"]`;

export const CreateCannonFile = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">Create a Cannonfile</h2>
      <p className="mb-4">
        Create a new Hardhat project by following the instructions{' '}
        <a
          href="https://hardhat.org/tutorial/creating-a-new-hardhat-project"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          here
        </a>
        . Then install the Hardhat Cannon plug-in:
      </p>
      <div className="mb-4">
        <CommandPreview command="npm install hardhat-cannon" />
      </div>
      <p className="mb-4">
        Load the plug-in at the top of your hardhat.config.js file with{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">
          {"require('hardhat-cannon');"}
        </code>
        &nbsp;or&nbsp;
        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">
          {"import 'hardhat-cannon';"}
        </code>
        &nbsp;if you&apos;re using Typescript.
      </p>
      <p className="mb-4">
        In the configuration file, set the default network like so:{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">
          {'defaultNetwork: "cannon"'}
        </code>
      </p>
      <p className="mb-4">Your project should have the following contract:</p>
      <div className="mb-4">
        <CodePreview code={code1} language="sol" />
      </div>
      <p className="mb-4">
        Create a cannonfile.toml in the root directory of the project with the
        following contents. If you plan to publish this package, you should
        customize the name. This will deploy the contract and set the unlock
        time to 1700000000:
      </p>
      <div className="mb-4">
        <CodePreview code={code2} language="ini" />
      </div>
      <p className="mb-4">
        Now build the cannonfile for local development and testing:
      </p>
      <div className="mb-4">
        <CommandPreview command="npx hardhat cannon:build" />
      </div>
      <p className="mb-4">
        This compiled your code and created a local deployment of your nascent
        protocol. You can now run this package locally using the command-line
        tool. (Here, we add the{' '}
        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">
          --registry-priority local
        </code>{' '}
        option to ensure we&apos;re using the version of this package that you
        just built, regardless of what others have published.)
      </p>
      <div className="mb-4">
        <CommandPreview command="cannon sample-hardhat-project --registry-priority local" />
      </div>
    </>
  );
};
