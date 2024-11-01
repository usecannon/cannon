import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export const RunPackage = () => {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight mb-2.5">
        Run a Cannon Package
      </h2>
      <p className="pb-4 mb-4 text-xl text-muted-foreground border-b border-border">
        Run a package from the explorer on a local node in seconds
      </p>
      <p className="mb-4">
        <a
          className="text-primary hover:underline inline-flex items-center gap-1"
          href="https://book.getfoundry.sh/getting-started/installation"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Foundry
          <ExternalLinkIcon className="h-4 w-4" />
        </a>{' '}
        if you haven&apos;t already.
      </p>
      <p className="mb-4">
        <CommandPreview command="curl -L https://foundry.paradigm.xyz | bash" />
      </p>
      <p className="mb-4">
        Install Cannon&apos;s{' '}
        <Link href={links.CLI} className="text-primary hover:underline">
          command-line interface
        </Link>
        .
      </p>
      <p className="mb-4">
        <CommandPreview command="npm install -g @usecannon/cli" />
      </p>
      <p className="mb-4">
        Run any package from{' '}
        <Link href={links.EXPLORE} className="text-primary hover:underline">
          the explorer
        </Link>{' '}
        with a <em>Cannon</em> deployment. This will start an{' '}
        <a
          href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil"
          className="text-primary hover:underline inline-flex items-center gap-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anvil node
          <ExternalLinkIcon className="h-4 w-4" />
        </a>{' '}
        with{' '}
        <a
          href="/packages/greeter/latest/13370-main"
          className="text-primary hover:underline inline-flex items-center gap-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          a deployment of the greeter package
          <ExternalLinkIcon className="h-4 w-4" />
        </a>{' '}
        for local testing and development:
      </p>
      <p className="mb-4">
        <CommandPreview command="cannon greeter" />
      </p>
      <p className="mb-4">
        Export the contract addresses and ABIs as a folder of JSON files. For
        example:
      </p>
      <p className="mb-4">
        <CommandPreview command="cannon inspect greeter --write-deployments ./deployments" />
      </p>
      <p className="mb-4">
        The command-line tool has a lot of additional functionality, including
        the ability to run packages on local forks and interact with deployments
        on remote networks. For example, press the <code>I</code> key after
        running a package to interact directly with the contracts using the CLI.{' '}
        <Link href={links.CLI} className="text-primary hover:underline">
          Learn more
        </Link>
      </p>
      <p>
        Next,{' '}
        <Link href={links.BUILD} className="text-primary hover:underline">
          build a protocol and add your own package to the registry
        </Link>
        .
      </p>
    </>
  );
};
