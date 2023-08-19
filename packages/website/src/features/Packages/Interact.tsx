import { GetPackagesQuery } from '@/types/graphql/graphql';
import { FC, useEffect, useMemo, useState } from 'react';
import { Alert, AlertIcon, Box, Flex, Spinner, Text } from '@chakra-ui/react';
import axios from 'axios';
import pako from 'pako';
import { ChainArtifacts } from '@usecannon/builder/src';
import { getOutput } from '@/lib/builder';
import { VersionInfo, VersionSelect } from '@/features/Packages/VersionSelect';
import { ProvisionStep } from '@/features/Packages/ProvisionStep';

type Package = GetPackagesQuery['packages'][0];
// type Tag = Package['tags'][0];
// type Variant = Tag['variants'][0];

export const Interact: FC<{ pkg: Package }> = ({ pkg }) => {
  const [loading, setLoading] = useState(true);
  const [ipfs, setIpfs] = useState<any>({});
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo>();
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});

  const output = useMemo(() => {
    return {
      '': {
        title: '',
        url: '',
        imports: cannonOutputs?.imports,
        contracts: cannonOutputs?.contracts,
      },
    };
  }, [cannonOutputs]);

  useEffect(() => {
    if (!selectedVersion) return;
    // this.$store.dispatch('changeChainId', this.selectedVariant.chain_id, this.$toast) TODO
    setLoading(true);

    const controller = new AbortController();

    const url = `https://ipfs.io/ipfs/${selectedVersion?.ipfs.replace(
      'ipfs://',
      ''
    )}`;
    console.log('url', url);
    axios
      .get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        // Parse IPFS data
        const uint8Array = new Uint8Array(response.data);
        const inflated = pako.inflate(uint8Array);
        const raw = new TextDecoder().decode(inflated);
        const _ipfs = JSON.parse(raw);
        console.log('IPFS:', _ipfs);
        setIpfs(_ipfs);

        // Get Builder Outputs
        setCannonOutputs(getOutput(_ipfs));
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });

    // Vue.nextTick(() => { // TODO
    //   this.scrollToAnchor();
    // });
    return () => {
      controller.abort();
    };
  }, [selectedVersion]);

  const hasProxy = useMemo(() => {
    return (
      ipfs.state && JSON.stringify(ipfs.state).toLowerCase().includes('proxy')
    );
  }, [ipfs]);

  return (
    <Box position="relative">
      {/*<InteractCommand :packageName="p.name" :variant="selectedVariant" />*/}

      <Alert
        my="8"
        status="warning"
        bg="blue.800"
        borderColor="blue.700"
        borderWidth="1px"
      >
        <AlertIcon />
        <Text fontWeight="bold">
          Review high-risk transactions carefully in your wallet application
          prior to execution.
        </Text>
      </Alert>

      {hasProxy && (
        <Alert
          my="8"
          status="info"
          bg="blue.800"
          borderColor="blue.700"
          borderWidth="1px"
        >
          <AlertIcon />
          <Text>
            If this protocol has a proxy contract, you should typically interact
            with it instead of the other contracts in the package.
          </Text>
        </Alert>
      )}

      {loading ? (
        <Box py="20" textAlign="center">
          <Spinner />
        </Box>
      ) : (
        <Box>
          <ProvisionStep
            imports={output}
            cannonOutputs={cannonOutputs}
            chainId={selectedVersion?.chain_id || 1}
          />
        </Box>
      )}
    </Box>
  );
};
