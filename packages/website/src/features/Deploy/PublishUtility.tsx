import { externalLinks } from '@/constants/externalLinks';
import { truncateAddress } from '@/helpers/ethereum';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { sleep } from '@/helpers/misc';
import { useStore } from '@/helpers/store';
import { useCannonPackage } from '@/hooks/cannon';
import { useCannonPackagePublishers } from '@/hooks/registry';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ExternalLinkIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import {
  CannonStorage,
  DEFAULT_REGISTRY_CONFIG,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
  publishPackage,
  CannonSigner,
} from '@usecannon/builder';
import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';
import { useSwitchChain, useWalletClient } from 'wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublishUtility(props: {
  deployUrl: string;
  targetChainId: number;
}) {
  const settings = useStore((s) => s.settings);

  const wc = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  // get the package referenced by this ipfs package
  const {
    resolvedName,
    resolvedVersion,
    resolvedPreset,
    ipfsQuery: ipfsPkgQuery,
  } = useCannonPackage(props.deployUrl);

  // then reverse check the package referenced by the
  const {
    pkgUrl: existingRegistryUrl,
    registryQuery,
    ipfsQuery: ipfsChkQuery,
  } = useCannonPackage(
    `${resolvedName}:${resolvedVersion}@${resolvedPreset}`,
    props.targetChainId
  );

  const packageUrl = `/packages/${resolvedName}/${
    resolvedVersion || 'latest'
  }/${props.targetChainId}-${resolvedPreset || 'main'}`;
  const packageDisplay = `${resolvedName}${
    resolvedVersion ? ':' + resolvedVersion : ''
  }${resolvedPreset ? '@' + resolvedPreset : ''}`;

  const publishers = useCannonPackagePublishers(resolvedName);

  const canPublish = publishers.some(
    ({ publisher }) =>
      wc.data?.account.address &&
      viem.isAddressEqual(publisher, wc.data?.account.address)
  );

  const { getChainById, customTransports, getExplorerUrl } = useCannonChains();

  const prepareAndPublishPackage = async (publishChainId: number) => {
    if (!wc.data) {
      throw new Error('Wallet not connected');
    }

    const [walletAddress] = await wc.data.getAddresses();

    const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map((config) => {
      const rpcUrl = config.rpcUrl.find(
        (url) => url.startsWith('https://') || url.startsWith('wss://')
      );

      return new OnChainRegistry({
        signer: { address: walletAddress, wallet: wc.data } as CannonSigner,
        address: config.address,
        provider: viem.createPublicClient({
          chain: getChainById(config.chainId),
          transport: customTransports[config.chainId] || viem.http(rpcUrl),
        }) as any,
      });
    });

    const targetRegistry = new FallbackRegistry(
      onChainRegistries,
      publishChainId === 10 ? 0 : 1
    );

    const fakeLocalRegistry = new InMemoryRegistry();

    // TODO: set meta url
    await fakeLocalRegistry.publish(
      [`${resolvedName}:${resolvedVersion}@${resolvedPreset}`],
      props.targetChainId,
      props.deployUrl,
      ''
    );

    const loader = new IPFSBrowserLoader(
      settings.ipfsApiUrl || externalLinks.IPFS_CANNON
    );

    const fromStorage = new CannonStorage(
      fakeLocalRegistry,
      { ipfs: loader },
      'ipfs'
    );
    const toStorage = new CannonStorage(
      targetRegistry,
      { ipfs: loader },
      'ipfs'
    );

    await publishPackage({
      packageRef: `${resolvedName}:${resolvedVersion}@${resolvedPreset}`,
      tags: ['latest'],
      chainId: props.targetChainId,
      fromStorage,
      toStorage,
      includeProvisioned: true,
    });
  };

  const publishMainnetMutation = useMutation({
    mutationFn: async () => {
      await prepareAndPublishPackage(mainnet.id);
    },
    onSuccess: async () => {
      await registryQuery.refetch();
    },
    onError(err) {
      // eslint-disable-next-line no-console
      console.error(err);
      if (err.message.includes('exceeds the balance of the account')) {
        toast.error('Error Publishing Package: Insufficient Funds');
      } else {
        toast.error('Error Publishing Package');
      }
    },
  });

  const publishOptimismMutation = useMutation({
    mutationFn: async () => {
      await prepareAndPublishPackage(optimism.id);
    },
    onSuccess: async () => {
      await registryQuery.refetch();
    },
    onError(err) {
      // eslint-disable-next-line no-console
      console.error(err);

      if (err.message.includes('exceeds the balance of the account')) {
        toast.error('Error Publishing Package: Insufficient Funds');
      } else {
        toast.error('Error Publishing Package');
      }
    },
  });

  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    // Any difference means that this deployment is not technically published
    return (
      <>
        {props.deployUrl && (
          <Link
            href={`/ipfs?cid=${props.deployUrl.substring(7)}`}
            className="flex items-center mb-4 no-underline hover:no-underline"
          >
            <Image
              src="/images/ipfs.svg"
              alt="IPFS"
              height={18}
              width={18}
              className="mr-2"
            />
            <span className="border-b border-dotted border-gray-300">
              {`${props.deployUrl.substring(0, 13)}...${props.deployUrl.slice(
                -6
              )}`}
            </span>
          </Link>
        )}

        {!!existingRegistryUrl && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              A package has already been published to {packageDisplay}.
              Publishing again will overwrite it.
            </AlertDescription>
          </Alert>
        )}

        {!canPublish && (
          <div>
            <p className="text-xs font-medium mb-2">
              Connect{' '}
              {publishers.length > 1
                ? 'one of the following wallets'
                : 'the following wallet'}{' '}
              to Ethereum or OP Mainnet to publish this package:
            </p>
            <ul className="mb-4 list-disc pl-4">
              {publishers.map(({ publisher, chainName, chainId }) => (
                <li key={publisher + chainName} className="mb-1">
                  <span className="font-mono font-light text-gray-200 text-xs">
                    {`${truncateAddress(publisher)} (${chainName})`}
                    <Link
                      href={getExplorerUrl(chainId, publisher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-block align-middle"
                    >
                      <ExternalLinkIcon />
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
            <Button className="w-full" disabled>
              Publish Package
            </Button>
          </div>
        )}

        {canPublish && (
          <>
            <Button
              className="w-full mb-2"
              disabled={
                publishOptimismMutation.isPending ||
                publishMainnetMutation.isPending
              }
              onClick={async () => {
                await switchChainAsync({ chainId: optimism.id });
                await sleep(100);
                publishOptimismMutation.mutate();
              }}
            >
              {publishOptimismMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Publishing...
                </span>
              ) : (
                'Publish to Optimism'
              )}
            </Button>
            <div className="text-xs text-center">
              <button
                onClick={async () => {
                  if (
                    publishOptimismMutation.isPending ||
                    publishMainnetMutation.isPending
                  ) {
                    return false;
                  }

                  await switchChainAsync({ chainId: mainnet.id });
                  await sleep(100);
                  publishMainnetMutation.mutate();
                }}
                className="hover:underline"
              >
                {publishMainnetMutation.isPending
                  ? 'Publishing...'
                  : 'Publish to Mainnet'}
              </button>{' '}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoCircledIcon className="inline-block" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Cannon will detect packages published to Optimism or
                    Mainnet. When publishing, the registry collects some ETH
                    (indicated as the value for the transaction in your wallet)
                    to support an IPFS cluster that pins package data.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </>
        )}
      </>
    );
  } else {
    return (
      <>
        <div className="space-y-4">
          <div>
            <p className="text-sm">Name</p>
            <p className="text-lg font-medium">{resolvedName}</p>
          </div>
          <div>
            <p className="text-sm">Version</p>
            <p className="text-lg font-medium">{resolvedVersion}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm">Preset</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoCircledIcon className="opacity-80" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Presets are useful for distinguishing multiple deployments
                    of the same protocol on the same chain.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-lg font-medium">{resolvedPreset}</p>
          </div>
          <Button asChild className="mt-4">
            <Link href={packageUrl}>View Package</Link>
          </Button>
        </div>
      </>
    );
  }
}
