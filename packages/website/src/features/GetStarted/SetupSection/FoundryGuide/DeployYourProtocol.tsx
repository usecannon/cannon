import { CommandPreview } from '@/components/CommandPreview';
import { externalLinks } from '@/constants/externalLinks';
import { links } from '@/constants/links';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export const DeployYourProtocol = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">Deploy Your Protocol</h2>
      <p className="mb-4">Deploying is just building on a remote network!</p>
      <div className="mb-4">
        <CommandPreview command="cannon build --network REPLACE_WITH_RPC_ENDPOINT --private-key REPLACE_WITH_KEY_THAT_HAS_GAS_TOKENS" />
      </div>
      <p className="mb-4">
        Verify your project&apos;s contracts on{' '}
        <a
          href={externalLinks.ETHERSCAN}
          className="font-medium text-primary hover:underline inline-flex items-center"
          target="_blank"
          rel="noopener noreferrer"
        >
          Etherscan
          <ExternalLink className="ml-1 h-4 w-4" />
        </a>
        :
      </p>
      <div className="mb-4">
        <CommandPreview command="cannon verify sample-foundry-project --api-key REPLACE_WITH_ETHERSCAN_API_KEY --chain-id REPLACE_WITH_CHAIN_ID" />
      </div>
      <p className="mb-4">
        Finally, publish your package on the{' '}
        <Link
          href={links.EXPLORE}
          className="font-medium text-primary hover:underline"
        >
          Cannon registry
        </Link>
        :
      </p>
      <div className="mb-4">
        <CommandPreview command="cannon publish sample-foundry-project --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET" />
      </div>
    </>
  );
};
