import { useWalletClient } from 'wagmi';
import { Chain, createPublicClient, http } from 'viem';
import { useMutation } from '@tanstack/react-query';
import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { Button, Link, Spinner, Text, useToast } from '@chakra-ui/react';

import { findChain } from '@/helpers/rpc';
import { useStore } from '@/helpers/store';
import { IPFSBrowserLoader } from '@/helpers/ipfs';

import { useCannonPackage } from '@/hooks/cannon';

import {
  CannonStorage,
  InMemoryRegistry,
  OnChainRegistry,
  publishPackage,
} from '@usecannon/builder';

export default function PublishUtility(props: {
  deployUrl: string;
  targetChainId: number;
}) {
  const settings = useStore((s) => s.settings);

  const wc = useWalletClient();
  const toast = useToast();

  // get the package referenced by this ipfs package
  const {
    resolvedName,
    resolvedVersion,
    resolvedPreset,
    ipfsQuery: ipfsPkgQuery,
  } = useCannonPackage('@' + props.deployUrl.replace('://', ':'));

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

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (settings.isIpfsGateway) {
        throw new Error(
          'You cannot publish on an IPFS gateway, only read operations can be done'
        );
      }

      if (settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
        throw new Error(
          'Update your IPFS URL to a Kubo RPC API URL to publish in the settings page.'
        );
      }

      if (!wc.data) {
        throw new Error('Wallet not connected');
      }

      const [walletAddress] = await wc.data.getAddresses();

      const targetRegistry = new OnChainRegistry({
        signer: { address: walletAddress, wallet: wc.data },
        address: settings.registryAddress,
        provider: createPublicClient({
          chain: findChain(Number.parseInt(settings.registryChainId)) as Chain,
          transport: http(),
        }),
      });

      const fakeLocalRegistry = new InMemoryRegistry();

      // TODO: set meta url
      await fakeLocalRegistry.publish(
        [`${resolvedName}:${resolvedVersion}@${resolvedPreset}`],
        props.targetChainId,
        props.deployUrl,
        ''
      );

      const loader = new IPFSBrowserLoader(
        settings.ipfsApiUrl || 'https://repo.usecannon.com/'
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
    },
    onSuccess() {
      void registryQuery.refetch();
    },
    onError() {
      toast({
        title: 'Error Publishing Package',
        description:
          'Confirm that the connected wallet is allowed to publish this package and a valid IPFS URL for pinning is in your settings.',
        status: 'error',
        duration: 30000,
        isClosable: true,
      });
    },
  });

  // any difference means that this deployment is not technically published
  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return (
      <Text opacity={0.8}>
        <Spinner boxSize={3} mx="auto" />
      </Text>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    return (
      <>
        {!existingRegistryUrl ? (
          <Text fontSize="sm" mb={3}>
            The package resulting from this deployment has not been published
            yet.
          </Text>
        ) : (
          <Text fontSize="sm" mb={3}>
            A different package has been published to the registry with a
            matching name and version.
          </Text>
        )}
        {settings.isIpfsGateway && (
          <Text fontSize="sm" mb={3}>
            You cannot publish on an IPFS gateway, only read operations can be
            done.
          </Text>
        )}
        {settings.ipfsApiUrl.includes('https://repo.usecannon.com') && (
          <Text fontSize="sm" mb={3}>
            You cannot publish on an repo endpoint, only read operations can be
            done.
          </Text>
        )}

        {wc.data?.chain?.id === Number.parseInt(settings.registryChainId) ? (
          <Button
            isDisabled={
              settings.isIpfsGateway ||
              settings.ipfsApiUrl.includes('https://repo.usecannon.com') ||
              publishMutation.isPending
            }
            colorScheme="teal"
            size="sm"
            onClick={() => publishMutation.mutate()}
            leftIcon={
              publishMutation.isPending ? <Spinner size="sm" /> : undefined
            }
          >
            {publishMutation.isPending
              ? 'Publishing...'
              : 'Publish to Registry'}
          </Button>
        ) : (
          <Text fontSize="xs" fontWeight="medium">
            <InfoOutlineIcon transform="translateY(-1.5px)" mr={1.5} />
            Connect a wallet using chain ID {settings.registryChainId} to
            publish
          </Text>
        )}
      </>
    );
  } else {
    return (
      <>
        <Text fontSize="xs">
          <Link href={packageUrl}>
            {packageDisplay}
            <ExternalLinkIcon ml={1} transform="translateY(-0.5px)" />
          </Link>
        </Text>
      </>
    );
  }
}
