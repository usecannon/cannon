import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

[var.main]
number = "420"

[deploy.counter]
artifact = "Counter"

[invoke.set_number]
target = ["counter"]
func = "setNumber"
args = ["<%= settings.number %>"]`;

export const CreateCannonFile = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">Create a Cannonfile</h2>
      <p className="mb-4">
        Create a new Foundry project with <code>forge init sample-project</code>
        . This will generate the following contract:
      </p>
      <div className="mb-4">
        <CodePreview code={code1} language="sol" />
      </div>
      <p className="mb-4">
        Create a cannonfile.toml in the root directory of the project with the
        following contents. If you plan to publish this package, you should
        customize the name. This will deploy the contract and set the number to
        420:
      </p>
      <div className="mb-4">
        <CodePreview code={code2} language="ini" />
      </div>
      <Alert className="mb-4 bg-gray-700">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Include Idempotent Functions</AlertTitle>
        <AlertDescription>
          When building a protocol with Cannon, include methods like{' '}
          <code>setConfiguration</code> (instead of/in addition to
          <code>addConfiguration</code> or <code>removeConfiguration</code>)
          such that changes to an <code>invoke</code> operation will result in
          predictable behavior.
        </AlertDescription>
      </Alert>
      <p className="mb-4">
        Now build the cannonfile for local development and testing:
      </p>
      <div className="mb-4">
        <CommandPreview command="cannon build" />
      </div>
      <p className="mb-4">
        This compiled your code and created a local deployment of your nascent
        protocol. You can now run this package locally using the command-line
        tool. (Here, we add the <code>--registry-priority local</code> option to
        ensure we&apos;re using the version of this package that you just built,
        regardless of what others have published.)
      </p>
      <div className="mb-4">
        <CommandPreview command="cannon sample-foundry-project --registry-priority local" />
      </div>
    </>
  );
};
