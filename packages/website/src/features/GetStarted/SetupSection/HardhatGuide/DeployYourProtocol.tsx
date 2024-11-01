import { CommandPreview } from '@/components/CommandPreview';
import NextLink from 'next/link';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { links } from '@/constants/links';

export const DeployYourProtocol = () => {
  return (
    <>
      <h2 className="text-xl font-semibold mb-3 mt-8">Deploy Your Protocol</h2>
      <p className="mb-4">
        Deploying is just building on a remote network! Be sure to use a network
        name that you&apos;ve&nbsp;
        <a
          className="text-primary hover:underline inline-flex items-center gap-1"
          href="https://hardhat.org/tutorial/deploying-to-a-live-network#deploying-to-remote-networks"
          target="_blank"
          rel="noopener noreferrer"
        >
          specified in your Hardhat Configuration file
          <ExternalLinkIcon className="h-4 w-4" />
        </a>
        .
      </p>
      <div className="mb-4">
        <CommandPreview command="npx hardhat cannon:build --network REPLACE_WITH_NETWORK_NAME" />
      </div>
      <p className="mb-4">
        Set up the&nbsp;
        <a
          className="text-primary hover:underline inline-flex items-center gap-1"
          href="https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan"
          target="_blank"
          rel="noopener noreferrer"
        >
          and verify your project&apos;s contracts
          <ExternalLinkIcon className="h-4 w-4" />
        </a>
        :
      </p>
      <div className="mb-4">
        <CommandPreview command="npx hardhat cannon:verify" />
      </div>
      <p className="mb-4">
        Finally, publish your package on the&nbsp;
        <NextLink href={links.EXPLORE} className="text-primary hover:underline">
          Cannon registry
        </NextLink>
        :
      </p>
      <div className="mb-4">
        <CommandPreview command="npx hardhat cannon:publish --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET" />
      </div>
    </>
  );
};
