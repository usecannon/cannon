import { FC, useMemo } from 'react';
import { Alert, AlertIcon, Box, Text } from '@chakra-ui/react';
import { getOutput } from '@/lib/builder';
import { ProvisionStep } from '@/features/Packages/ProvisionStep';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQueryIpfsData } from '@/hooks/ipfs';

export const Interact: FC<{ variant: any }> = ({ variant }) => {
  const { data: ipfs, isLoading } = useQueryIpfsData(
    variant?.deploy_url,
    !!variant?.deploy_url
  );

  const cannonOutputs = useMemo(() => (ipfs ? getOutput(ipfs) : {}), [ipfs]);

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

  const hasProxy = useMemo(() => {
    return (
      ipfs?.state && JSON.stringify(ipfs.state).toLowerCase().includes('proxy')
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

      {isLoading ? (
        <Box py="20" textAlign="center">
          <CustomSpinner mx="auto" />
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
