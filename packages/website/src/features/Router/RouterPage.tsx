'use client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NextLink from 'next/link';
import React from 'react';
import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';

const code1 = `name = "sample-router-project"
version = "0.1"
description = "Sample Router Project"

[contract.Counter]
artifact = "Counter"

[contract.AnotherCounter]
artifact = "AnotherCounter"

[router.Router]
contracts = [
  "Counter",
  "AnotherCounter",
]`;

const code2 = `[setting.admin]
defaultValue = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

[provision.proxy]
source = "transparent-upgradable-proxy:4.9.3"
options.admin = "<%= settings.admin %>"
options.implementation = "<%= contracts.Router.address %>"
options.abi = "<%= JSON.stringify(contracts.Router.abi) %>"`;

export const RouterPage = () => {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-wide mb-2.5">
        Deploy a Router
      </h2>

      <p className="pb-4 mb-6 border-b border-border text-xl text-muted-foreground">
        Build an upgradable protocol of any size with Synthetix&apos;s Router
        plug-in
      </p>

      <p className="mb-4">
        There is a limit to the size of smart contracts deployed on EVM
        blockchains. This can create complications during the development of
        protocols, where engineers may want an arbitrary amount of code to be
        executable at a single address.
      </p>

      <p className="mb-4">
        To avoid the need to manage complex inheritance and dependency
        structures, Cannon includes{' '}
        <a
          className="underline"
          href="https://github.com/synthetixio/synthetix-router"
          target="_blank"
          rel="noopener noreferrer"
        >
          Synthetix&apos;s Router plug-in
        </a>
        . This can be used by defining a{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          router
        </code>{' '}
        operation in Cannonfiles. This accepts an array of contracts and
        automatically generates a router contract which will delegate calls to
        them. For a more technical explanation of the router, review its{' '}
        <a
          className="underline"
          href="https://github.com/synthetixio/synthetix-router#readme"
          target="_blank"
          rel="noopener noreferrer"
        >
          README
        </a>
        .
      </p>

      <p className="mb-4">
        In this guide, we&apos;ll walk through{' '}
        <a
          className="underline"
          href="https://github.com/usecannon/cannon/tree/main/examples/router-architecture"
          target="_blank"
          rel="noopener noreferrer"
        >
          a simple example
        </a>{' '}
        that uses the router and adds a transparent upgradable proxy.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-4">Create a Router</h3>

      <p className="mb-4">Start by installing/upgrading Cannon:</p>
      <div className="mb-4">
        <CommandPreview command="npm i -g @usecannon/cli" />
      </div>

      <p className="mb-4">
        Then set up a new{' '}
        <a
          className="underline"
          href="https://github.com/foundry-rs/foundry"
          target="_blank"
          rel="noopener noreferrer"
        >
          Foundry
        </a>{' '}
        project:
      </p>

      <div className="mb-4">
        <CommandPreview command="forge init" />
      </div>

      <p className="mb-4">
        This project will include a{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          Counter.sol
        </code>{' '}
        contract by default. Duplicate this contract, rename it, and alter the
        function names in it. For this example, we&apos;ll assume you&apos;ve
        renamed the file and contract to{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          AnotherCounter
        </code>
        .
      </p>

      <p className="mb-4">
        Create{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          cannonfile.toml
        </code>{' '}
        that deploys the two contracts and a router:
      </p>

      <div className="mb-4">
        <CodePreview code={code1} language="ini" />
      </div>

      <p className="mb-4">Build the Cannonfile:</p>
      <div className="mb-4">
        <CommandPreview command="cannon build" />
      </div>

      <p className="mb-4">
        Run it. (By default, Cannon runs packages from the{' '}
        <NextLink href="/search" className="underline">
          package manager
        </NextLink>
        . Here, we add the{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          --registry-priority local
        </code>{' '}
        option to ensure we&apos;re using the version of this package that you
        just built, regardless of what others have published.)
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon sample-router-project --registry-priority local" />
      </div>

      <p className="mb-4">
        Press{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">i</code> to
        interact with the contracts in this project. You&apos;ll see that the
        router contract exposes the functions from both contracts.
      </p>

      <Alert className="mb-4">
        <AlertDescription>
          <h4 className="font-semibold mb-1">
            Interact with the router contract
          </h4>
          <p>
            When using this pattern, users should interact with the router and
            not the dependent contracts directly.
          </p>
        </AlertDescription>
      </Alert>

      <h3 className="text-xl font-semibold mt-6 mb-4">
        Add an Upgradability Proxy
      </h3>

      <p className="mb-4">
        We can also deploy a{' '}
        <NextLink
          href="/packages/transparent-upgradable-proxy"
          className="underline"
        >
          transparent upgradeable proxy
        </NextLink>{' '}
        pointing at the router, making this protocol upgradeable. In the
        Cannonfile, add a setting for the admin (which will be allowed to
        upgrade the proxy) and then provision the package which includes{' '}
        <a
          className="underline"
          href="https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/transparent/TransparentUpgradeableProxy.sol"
          target="_blank"
          rel="noopener noreferrer"
        >
          the proxy contract
        </a>
        :
      </p>

      <div className="mb-4">
        <CodePreview code={code2} language="ini" />
      </div>

      <p className="mb-4">
        If you alter one of your contracts, when building, Cannon will
        automatically detect this, generate a new router, and upgrade the proxy
        to point at it. (Old versions of the contracts aren&apos;t included in
        the router, saving gas.) When building an upgrade, increase the version
        in your Cannonfile and use the{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          --upgrade-from
        </code>{' '}
        option to reference the package from your previous version.
      </p>

      <Alert className="mb-4">
        <AlertDescription>
          <h4 className="font-semibold mb-1">
            Interact with the proxy contract
          </h4>
          <p>
            When using this pattern, users should always interact with the proxy
            contract rather than the router contract.
          </p>
        </AlertDescription>
      </Alert>

      <h3 className="text-xl font-semibold mt-6 mb-4">
        Avoid Storage Collisions
      </h3>

      <p className="mb-4">
        Changing the storage layout in smart contracts can irreversibly corrupt
        protocol data. Thoroughly understand how to avoid{' '}
        <a
          className="underline"
          href="https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies"
          target="_blank"
          rel="noopener noreferrer"
        >
          storage collisions
        </a>{' '}
        when upgrading. If you&apos;re using Hardhat, check out the{' '}
        <a
          className="underline"
          href="https://github.com/Synthetixio/synthetix-v3/tree/main/utils/hardhat-storage"
          target="_blank"
          rel="noopener noreferrer"
        >
          hardhat-storage
        </a>{' '}
        plug-in, which validates storage changes.
      </p>

      <p className="mb-4">
        You can use libraries for executing storage reads/writes to create an
        MVC-style architecture. See the{' '}
        <a
          className="underline"
          href="https://docs.synthetix.io/v/v3/for-developers/technical-architecture"
          target="_blank"
          rel="noopener noreferrer"
        >
          Synthetix V3 documentation
        </a>{' '}
        for inspiration.
      </p>

      <hr className="my-6 opacity-10" />

      <p>
        If the protocol is owned by a{' '}
        <a
          className="underline"
          href="https://safe.global/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe
        </a>
        , you can use the{' '}
        <NextLink href="/deploy" className="underline">
          deployer
        </NextLink>{' '}
        to run upgrades. (
        <a
          className="underline"
          href="https://docs.safe.global/safe-smart-account/modules"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe Modules
        </a>{' '}
        and{' '}
        <a
          className="underline"
          href="https://docs.safe.global/safe-smart-account/guards"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe Guards
        </a>{' '}
        can be developed for additional on-chain, governance-related logic.)
        When your protocol no longer needs to be upgraded, it can be made
        immutable with a call to{' '}
        <code className="px-1.5 py-0.5 bg-gray-700 rounded text-sm">
          renounceOwnership
        </code>{' '}
        on the proxy.
      </p>
    </>
  );
};
