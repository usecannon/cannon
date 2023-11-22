import { ethers } from 'ethers';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { useAccount, useMutation, useWalletClient } from 'wagmi';
import {
  CannonStorage,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
  publishPackage,
} from '@usecannon/builder';
import { CheckIcon } from '@chakra-ui/icons';
import { useCannonPackage } from '@/hooks/cannon';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { useStore } from '@/helpers/store';

export default function PublishUtility(props: {
  deployUrl: string;
  targetVariant: string;
}) {
  const settings = useStore((s) => s.settings);

  const wc = useWalletClient();
  const account = useAccount();

  // get the package referenced by this ipfs package
  const {
    resolvedName,
    resolvedVersion,
    ipfsQuery: ipfsPkgQuery,
  } = useCannonPackage('@' + props.deployUrl.replace('://', ':'));

  const [chainId, preset] = props.targetVariant.split('-');

  // then reverse check the package referenced by the
  const {
    pkgUrl: existingRegistryUrl,
    registryQuery,
    ipfsQuery: ipfsChkQuery,
  } = useCannonPackage(
    `${resolvedName}:${resolvedVersion}`,
    props.targetVariant
  );

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (settings.isIpfsGateway) {
        throw new Error(
          'You cannot publish on an IPFS gateway, only read operations can be done'
        );
      }

      console.log(
        'publish triggered',
        wc,
        resolvedName,
        resolvedVersion,
        props.targetVariant
      );

      const targetRegistry = new OnChainRegistry({
        signerOrProvider: new ethers.providers.Web3Provider(
          wc.data as any
        ).getSigner(account.address),
        address: settings.registryAddress,
      });

      const fakeLocalRegistry = new InMemoryRegistry();
      // TODO: set meta url
      void fakeLocalRegistry.publish(
        [`${resolvedName}:${resolvedVersion}@${preset}`],
        Number.parseInt(chainId),
        props.deployUrl,
        ''
      );

      const loader = new IPFSBrowserLoader(
        settings.ipfsApiUrl || 'https://repo.usecannon.com/'
      );

      const fromStorage = new CannonStorage(
        new FallbackRegistry([fakeLocalRegistry, targetRegistry]),
        { ipfs: loader },
        'ipfs'
      );
      const toStorage = new CannonStorage(
        targetRegistry,
        { ipfs: loader },
        'ipfs'
      );

      await publishPackage({
        packageRef: `${resolvedName}:${resolvedVersion}@${preset}`,
        tags: settings.publishTags.split(','),
        chainId: Number.parseInt(chainId),
        fromStorage,
        toStorage,
        includeProvisioned: true,
      });
    },
    onSuccess() {
      void registryQuery.refetch();
    },
  });

  // any difference means that this deployment is not technically published
  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return (
      <Text opacity={0.8}>
        <Spinner boxSize={3} mr={1} /> Loading
      </Text>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    return (
      <FormControl mb="8">
        {!existingRegistryUrl ? (
          <Text mb={3}>
            The package resulting from this deployment has not been published to
            the registry.
          </Text>
        ) : (
          <Text mb={3}>
            A different package has been published to the registry with a
            matching name and version.
          </Text>
        )}
        {settings.isIpfsGateway && (
          <Text mb={3}>
            You cannot publish on an IPFS gateway, only read operations can be
            done.
          </Text>
        )}
        <Button
          isDisabled={
            settings.isIpfsGateway ||
            wc.data?.chain?.id !== 1 ||
            publishMutation.isLoading
          }
          onClick={() => publishMutation.mutate()}
        >
          {publishMutation.isLoading
            ? [<Spinner key={0} />, ' Publish in Progress...']
            : 'Publish to Registry'}
        </Button>
        {wc.data?.chain?.id !== 1 && (
          <FormHelperText>
            You must set your wallet to Ethereum Mainnet to publish this
            package.
          </FormHelperText>
        )}
      </FormControl>
    );
  } else {
    return (
      <Box
        display="inline-block"
        borderRadius="lg"
        bg="blackAlpha.300"
        px={4}
        py={3}
      >
        <Box
          backgroundColor="green"
          borderRadius="full"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          boxSize={5}
          mr={2.5}
        >
          <CheckIcon color="white" boxSize={2.5} />
        </Box>
        <Text fontWeight="bold" display="inline">
          Published to Registry
        </Text>
      </Box>
    );
  }
}
