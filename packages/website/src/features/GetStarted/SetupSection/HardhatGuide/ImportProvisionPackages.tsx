import { Snippet } from '@/components/snippet';
import Link from 'next/link';
import { links } from '@/constants/links';

const code1 = `[pull.synthetix_omnibus]
source ="synthetix-omnibus:latest"

[deploy.sample_integration]
artifact = "SampleIntegration"
args = [
    "<%= imports.synthetix_omnibus.contracts.system.CoreProxy %>",
    "<%= imports.synthetix_omnibus.contracts.system.USDProxy %>"
]`;

const code2 = `[clone.synthetix]
source = "synthetix:latest"
owner = "<%= settings.owner %>"

[invoke.createPool]
target = ["synthetix.CoreProxy"]
from = "<%= settings.user %>"
func = "createPool"
args = [
    "1",
    "<%= settings.owner %>"
]`;

export const ImportProvisionPackages = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">
        Pull and Clone Packages
      </h2>
      <p className="mb-4">
        You can use packages in your Cannonfiles with the pull and clone
        operations.
      </p>
      <p className="mb-4">
        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          pull
        </code>
        &nbsp; packages to reference the addresses in their deployment data.
        Find which networks each package has deployment data for on the&nbsp;
        <Link
          href={links.EXPLORE}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          registry explorer
        </Link>
        .
      </p>
      <p className="mb-4">
        For example, the Synthetix Sandbox contains a&nbsp;
        <a
          href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Cannonfile that deploys the sample integration contract connected to
          the official deployment addresses
        </a>
        . The relevant code looks like this:
      </p>
      <div className="mb-4">
        <Snippet>
          <code>{code1}</code>
        </Snippet>
      </div>
      <p className="mb-4">
        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          clone
        </code>{' '}
        packages to deploy new instances of their protocol&apos;s contracts.
      </p>
      <p className="mb-4">
        For example, the Synthetix Sandbox contains a&nbsp;
        <a
          href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Cannonfile that clones a new instance of Synthetix
        </a>
        &nbsp;and sets up a custom development environment. This is a simplified
        version of the relevant code:
      </p>
      <div className="mb-4">
        <Snippet>
          <code>{code2}</code>
        </Snippet>
      </div>
    </>
  );
};
