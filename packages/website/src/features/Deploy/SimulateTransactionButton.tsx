import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Button, Image } from '@chakra-ui/react';

interface Props {
  safe: SafeDefinition;
  safeTxn: SafeTransaction | null;
  execTransactionData?: string;
  signer: string;
}

export function SimulateTransactionButton({
  safe,
  safeTxn,
  execTransactionData,
  signer,
}: Props) {
  if (!safeTxn) return null;

  const queryParams = {
    block: '',
    blockIndex: '0',
    from: signer,
    gas: '8000000',
    gasPrice: '0',
    value: Number(safeTxn.value).toString() || '0',
    contractAddress: safe.address,
    rawFunctionInput: execTransactionData || '',
    network: `${safe.chainId}`,
    headerBlockNumber: '',
    headerTimestamp: '',
    // set Safe signers threshold to 1
    stateOverrides: JSON.stringify([
      {
        contractAddress: safe.address,
        storage: [
          {
            key: '0x0000000000000000000000000000000000000000000000000000000000000004',
            value:
              '0x0000000000000000000000000000000000000000000000000000000000000001',
          },
        ],
      },
    ]),
  } satisfies { [key: string]: string };

  const searchParams = new URLSearchParams(queryParams).toString();

  return (
    <Button
      size="sm"
      fontSize="sm"
      as="a"
      href={`https://dashboard.tenderly.co/simulator/new?${searchParams}`}
      colorScheme="white"
      background="whiteAlpha.100"
      border="1px solid"
      borderColor="whiteAlpha.300"
      fontWeight={400}
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
      Simulate on Tenderly
    </Button>
  );
}
