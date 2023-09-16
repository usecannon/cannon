import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/TransactionDetailsPage');
  },
  {
    ssr: false,
  }
);

export const metadata: Metadata = {
  title: 'Cannon | Transaction Details',
};

export default function TransactionDetails({
  params,
}: {
  params: {
    safeAddress: string;
    chainId: string;
    nonce: string;
    sigHash: string;
  };
}) {
  return (
    <NoSSR
      safeAddress={params.safeAddress}
      chainId={params.chainId}
      nonce={params.nonce}
      sigHash={params.sigHash}
    />
  );
}
