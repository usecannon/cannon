import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';

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
    <a
      href={`https://dashboard.tenderly.co/simulator/new?${searchParams}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      simulate the transaction using Tenderly
    </a>
  );
}
