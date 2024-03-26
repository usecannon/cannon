import { createSimulationData } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Button, Image } from '@chakra-ui/react';

interface Props {
  safe: SafeDefinition;
  safeTxn: SafeTransaction | null;
}

export default function SimulateTransactionButton({ safe, safeTxn }: Props) {
  if (!safeTxn) return null;

  return (
    <Button
      mt={3}
      size="xs"
      as="a"
      href={`https://dashboard.tenderly.co/simulator/new?block=&blockIndex=0&from=${
        safe.address
      }&gas=${8000000}&gasPrice=0&value=${safeTxn?.value}&contractAddress=${
        safe?.address
      }&rawFunctionInput=${createSimulationData(safeTxn)}&network=${
        safe.chainId
      }&headerBlockNumber=&headerTimestamp=`}
      colorScheme="whiteAlpha"
      background="whiteAlpha.100"
      border="1px solid"
      borderColor="whiteAlpha.300"
      leftIcon={
        <Image
          height="14px"
          src="/images/tenderly.svg"
          alt="Safe"
          objectFit="cover"
        />
      }
      target="_blank"
      rel="noopener noreferrer"
      _hover={{
        bg: 'whiteAlpha.200',
        borderColor: 'whiteAlpha.400',
      }}
    >
      Simulate Transaction
    </Button>
  );
}
