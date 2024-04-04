import { useWalletClient } from 'wagmi';
import { Chain, createPublicClient, http } from 'viem';
import { useMutation } from '@tanstack/react-query';
import {
  InfoOutlineIcon,
  QuestionOutlineIcon,
  ExternalLinkIcon,
} from '@chakra-ui/icons';
import {
  Button,
  Link,
  Spinner,
  Text,
  useToast,
  Tooltip,
  Image,
  Alert,
  AlertIcon,
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

  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return (
      <Text textAlign="center">
        <Spinner boxSize={6} opacity={0.8} mt={3} />
      </Text>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    // Any difference means that this deployment is not technically published
    return (
      <>
        {props.deployUrl && (
          <Link
            href={`/ipfs?cid=${props.deployUrl.substring(7)}`}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            display="flex"
            alignItems="center"
            mb={4}
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

        {!!existingRegistryUrl && (
          <Alert mb={4} status="warning" bg="gray.700" fontSize="sm">
            <AlertIcon boxSize={4} mr={3} />
            <Text>
              A different package has already been published to {packageDisplay}
              . Publishing again will overwrite it.
            </Text>
          </Alert>
        )}

        {/* TODO: these should change wallet chain id if necessary */}
        {settings.isIpfsGateway ? (
          <Alert mb={4} status="warning" bg="gray.700" fontSize="sm">
            <AlertIcon boxSize={4} mr={3} />
            <Text>
              You cannot publish using an IPFS gateway. Please{' '}
              <Link href="/settings" isExternal>
                use a Kubo RPC API
              </Link>
              .
            </Text>
          </Alert>
        ) : (
          <>
            <Button
              variant="outline"
              colorScheme="white"
              size="sm"
              bg="teal.900"
              borderColor="teal.500"
              _hover={{ bg: 'teal.800' }}
              textTransform="uppercase"
              letterSpacing="1px"
              fontFamily="var(--font-miriam)"
              color="gray.200"
              fontWeight={500}
              isDisabled={settings.isIpfsGateway || publishMutation.isPending}
              mb={2}
              w="full"
              onClick={() => publishMutation.mutate()}
              isLoading={publishMutation.isPending}
            >
              Publish to Optimism
            </Button>
            <Text fontSize="xs" textAlign="center">
              <Link>Publish to Mainnet</Link>{' '}
              <Tooltip label="Cannon will detect packages published to Optimism or Mainnet.">
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

        <Button
          mt={2}
          as={Link}
          href={packageUrl}
          variant="outline"
          colorScheme="white"
          size="sm"
          bg="teal.900"
          borderColor="teal.500"
          _hover={{ bg: 'teal.800', textDecoration: 'none' }}
          textTransform="uppercase"
          letterSpacing="1px"
          fontFamily="var(--font-miriam)"
          color="gray.200"
          fontWeight={500}
          textDecoration="none"
          isExternal
          rightIcon={<ExternalLinkIcon transform="translateY(-1px)" />}
        >
          View Package
        </Button>
      </>
    );
  }
}
