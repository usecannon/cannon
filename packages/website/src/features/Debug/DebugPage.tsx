'use client';
import { ExternalLink } from 'lucide-react'; // for external link icon
import { CommandPreview } from '@/components/CommandPreview';
import Link from 'next/link';

export const DebugPage = () => {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight mb-2.5">
        Debugging Tips
      </h2>

      <p className="pb-4 mb-6 border-b border-border text-xl text-muted-foreground">
        Troubleshoot issues with your protocol during development and testing.
      </p>

      <p className="mb-4">
        Protocol development can often involve frustrating errors that consist
        of inscrutable bytecode. Function calls staged to a Safe might not be
        legible. A dreaded{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          0x
        </code>{' '}
        error may be returned from a contract with no reason for the revert to
        be found.
      </p>

      <p className="mb-4">
        Cannon can leverage data from packages to decode bytecode, generate
        human-readable stack traces, and send transactions to protocols.
      </p>

      <p className="mb-2">
        To use the{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          decode
        </code>
        ,{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          trace
        </code>
        , and{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          interact
        </code>{' '}
        commands, start by installing/upgrading Cannon:
      </p>

      <div className="mb-4">
        <CommandPreview command="npm i -g @usecannon/cli" />
      </div>

      <h3 className="text-xl font-semibold mb-3 mt-9">Decode</h3>

      <p className="mb-4">
        You may encounter a hex string related to a protocol, but can&apos;t
        tell what it is. Centralized services such as{' '}
        <Link
          href="https://openchain.xyz/tools/abi"
          className="text-primary underline hover:text-primary/90 inline-flex items-center"
          target="_blank"
          rel="noopener noreferrer"
        >
          ABI Tools
          <ExternalLink className="ml-1 h-3 w-3" />
        </Link>{' '}
        or the{' '}
        <Link
          href="https://www.4byte.directory/"
          className="text-primary underline hover:text-primary/90 inline-flex items-center"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ethereum Signature Database
          <ExternalLink className="ml-1 h-3 w-3" />
        </Link>{' '}
        may be able to help, but won&apos;t be useful during protocol
        development or if the relevant ABI hasn&apos;t been uploaded there.
      </p>

      <p className="mb-4">
        You can pass hex data to Cannon&apos;s{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          decode
        </code>{' '}
        command, along with the package name and a relevant chain ID, to get a
        human-readable version of function calls, function output, event data,
        and error data.
      </p>

      <p className="mb-2">
        For example, the following command decodes error data:
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon decode synthetix-omnibus --chain-id 84531 --preset competition 0xb87daa32000000000000000000000000000000000000000000000000000000006502188b00000000000000000000000000000000000000000000000000000000650218190000000000000000000000000000000000000000000000000000000065021855" />
      </div>

      <div className="mb-4 w-full overflow-x-auto">
        <img
          width="100%"
          src="/images/guide_debug_1.png"
          alt="first debug guide"
        />
      </div>

      <h3 className="text-xl font-semibold mb-3 mt-9">Trace</h3>

      <p className="mb-4">
        If you&apos;d like to better understand the execution of a
        transaction—whether or not it resulted in an error—you can use
        Cannon&apos;s{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          trace
        </code>{' '}
        command. This command accepts a transaction hash from a remote network
        or hex-encoded transaction data (as you might find in a gas estimation
        error).
      </p>

      <p className="mb-4">
        The command includes some options that allow you to simulate how a
        transaction (or transaction data) would execute under different
        circumstances:{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          --block-number
        </code>
        ,{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          --to
        </code>
        ,{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          --from
        </code>
        , and{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          --value
        </code>
        .{' '}
        <strong>
          Note that you must connect to an archive node (using the{' '}
          <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
            --rpc-url
          </code>{' '}
          option) to successfully simulate a call on a historical block.
        </strong>
      </p>

      <p className="mb-2">
        For example, the following command provides a full stack trace for
        retrieving the debt associated with a pool&apos;s vault in Synthetix V3:
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon trace --chain-id 10 synthetix-omnibus 0x2fb8ff2400000000000000000000000000000000000000000000000000000000000000010000000000000000000000008700daec35af8ff88c16bdf0418774cb3d7599b4 --to 0xffffffaEff0B96Ea8e4f94b2253f31abdD875847 --rpc-url https://optimism.publicnode.com" />
      </div>

      <div className="mb-4 w-full overflow-x-auto">
        <img
          src="/images/guide_debug_2.png"
          alt="second debug guide"
          width="100%"
        />
      </div>

      <h3 className="text-xl font-semibold mb-3 mt-9">Interact</h3>

      <p className="mb-4">
        Similar to the{' '}
        <Link
          href="/packages/synthetix/latest/1-main/interact"
          className="text-primary underline hover:text-primary/90"
        >
          interact tab
        </Link>{' '}
        in the package explorer, the CLI allows you to call view functions and
        send transactions to protocols in the command-line interface.
      </p>

      <p className="mb-2">
        For example, you can use the interact tool to call functions on
        Synthetix V3:
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon interact synthetix --chain-id 1 --rpc-url https://ethereum.publicnode.com" />
      </div>

      <p className="mb-4">
        If you&apos;d like to send transactions, you can use{' '}
        <a href="https://frame.sh/" target="_blank">
          Frame
        </a>{' '}
        or include a private key using either an environment variable{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          CANNON_PRIVATE_KEY
        </code>{' '}
        or the{' '}
        <code className="font-mono bg-muted px-[0.3rem] py-[0.2rem] rounded-[0.2rem]">
          --private-key
        </code>{' '}
        option.
      </p>

      <p>
        For more information on the command-line interact command, see the{' '}
        <Link
          href="/learn/cli"
          className="text-primary underline hover:text-primary/90"
        >
          CLI section of the documentation
        </Link>
        .
      </p>
    </>
  );
};
