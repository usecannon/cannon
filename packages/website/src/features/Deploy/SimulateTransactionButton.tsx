import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

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
    <Button variant="secondary" asChild>
      <a
        href={`https://dashboard.tenderly.co/simulator/new?${searchParams}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          width={12}
          height={12}
          src="/images/tenderly.svg"
          alt="Safe"
          className="object-cover"
        />
        Simulate on Tenderly
        <ExternalLinkIcon className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}
