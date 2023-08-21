import { FC, useEffect, useMemo, useState } from 'react';
import { Alert, AlertIcon, Box, Text } from '@chakra-ui/react';
import axios from 'axios';
import pako from 'pako';
import { ChainArtifacts } from '@usecannon/builder/src';
import { getOutput } from '@/lib/builder';
import { ProvisionStep } from '@/features/Packages/ProvisionStep';
import { CustomSpinner } from '@/components/CustomSpinner';

export const Interact: FC<{ variant: any }> = ({ variant }) => {
  const [loading, setLoading] = useState(true);
  const [ipfs, setIpfs] = useState<any>({});
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
    if (!variant) return;
    setLoading(true);

    const controller = new AbortController();

    const url = `https://ipfs.io/ipfs/${variant?.deploy_url.replace(
      'ipfs://',
      ''
    )}`;

    axios
      .get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        // Parse IPFS data
        const uint8Array = new Uint8Array(response.data);
        const inflated = pako.inflate(uint8Array);
        const raw = new TextDecoder().decode(inflated);
        const _ipfs = JSON.parse(raw);
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

    return () => {
      controller.abort();
    };
  }, [variant]);

  const hasProxy = useMemo(() => {
    return (
      ipfs.state && JSON.stringify(ipfs.state).toLowerCase().includes('proxy')
    );
  }, [ipfs]);

  return (
    <Box position="relative">
      {/*<InteractCommand :packageName="p.name" :variant="selectedVariant" />*/}

      <Alert
        mb="6"
        status="warning"
        bg="gray.800"
        border="1px solid"
        borderColor="gray.700"
      >
        <AlertIcon />
        <Text fontWeight="bold">
          Review high-risk transactions carefully in your wallet application
          prior to execution
        </Text>
      </Alert>

      {hasProxy && (
        <Alert
          mb="6"
          status="info"
          bg="gray.800"
          border="1px solid"
          borderColor="gray.700"
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
          <CustomSpinner />
        </Box>
      ) : (
        <Box>
          <ProvisionStep
            imports={output}
            cannonOutputs={cannonOutputs}
            chainId={variant?.chain_id}
          />
        </Box>
      )}
    </Box>
  );
};
