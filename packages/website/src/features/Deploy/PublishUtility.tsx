import { useWalletClient } from 'wagmi';
import { Chain, createPublicClient, http } from 'viem';
import { useMutation } from '@tanstack/react-query';
import { InfoOutlineIcon, QuestionOutlineIcon } from '@chakra-ui/icons';
import {
  Button,
  Link,
  Spinner,
  Text,
  useToast,
  Tooltip,
  Image,
} from '@chakra-ui/react';
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
import { find } from 'lodash';

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

      if (!wc.data) {
        throw new Error('Wallet not connected');
      }

      const [walletAddress] = await wc.data.getAddresses();

      const targetRegistry = new OnChainRegistry({
        signer: { address: walletAddress, wallet: wc.data },
        address: settings.registryAddress,
        provider: createPublicClient({
          chain: findChain(Number.parseInt(settings.registryChainId)) as Chain, // TODO: use Chain ID based on button or link used
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
      <Text textAlign="center">
        <Spinner boxSize={6} opacity={0.8} mt={3} />
      </Text>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    return (
      <>
        {props.deployUrl && (
          <Link
            href={`/ipfs?cid=${props.deployUrl.substring(7)}`}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            display="flex"
            alignItems="center"
            mb={3}
          >
            <Image
              display="inline-block"
              src="/images/ipfs.svg"
              alt="IPFS"
              height="14px"
              mr={1.5}
            />
            <Text
              fontSize="xs"
              display="inline"
              borderBottom="1px dotted"
              borderBottomColor="gray.300"
            >
              {`${props.deployUrl.substring(0, 13)}...${props.deployUrl.slice(
                -6
              )}`}
            </Text>
          </Link>
        )}

        {/* TODO: more like 'alert' style */}
        {!!existingRegistryUrl && (
          <Text fontSize="sm" mb={3}>
            A different package has been published to the registry with a
            matching name and version at {existingRegistryUrl}. Publishing will
            overwrite.
          </Text>
        )}

        {/* TODO: these should change wallet chain id if necessary */}
        {/* TODO: verify loading/refresh UX works after submission, for both networks */}
        {settings.isIpfsGateway ? (
          <Text fontSize="sm" mb={3}>
            You cannot publish on an IPFS gateway. Please use an Kubo-compliant
            API. Link to update it
          </Text>
        ) : (
          <>
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
                : 'Publish to Optimism'}
            </Button>
            <Text size="xs">
              <Link>Publish to Mainnet</Link>{' '}
              <Tooltip label="TODO: note about prioritization">
                <InfoOutlineIcon />
              </Tooltip>
            </Text>
          </>
        )}
      </>
    );
  } else {
    return (
      <>
        <Text mb={1} fontSize="sm">
          <strong>Name:</strong> {resolvedName}
        </Text>
        {resolvedVersion !== 'latest' && (
          <Text mb={1} fontSize="sm">
            <strong>Version:</strong> {resolvedVersion}
          </Text>
        )}
        {resolvedPreset !== 'main' && (
          <Text mb={1} fontSize="sm">
            <strong>Preset:</strong> {resolvedPreset}
            <Tooltip label="Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.">
              <QuestionOutlineIcon ml={1.5} opacity={0.8} />
            </Tooltip>
          </Text>
        )}

        {/* TODO: different button style */}
        <Button
          mt={2}
          size="xs"
          colorScheme="teal"
          as={Link}
          href={packageUrl}
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
        >
          {packageDisplay}
        </Button>
      </>
    );
  }
}
