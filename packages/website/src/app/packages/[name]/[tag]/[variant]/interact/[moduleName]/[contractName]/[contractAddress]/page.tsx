import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(() => import('@/features/Packages/InteractPage'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Interact({
  params,
}: {
  params: {
    name: string;
    tag: string;
    variant: string;
    moduleName: string;
    contractName: string;
    contractAddress: string;
  };
}) {
  return (
    <NoSSR
      name={decodeURIComponent(params.name)}
      tag={decodeURIComponent(params.tag)}
      variant={decodeURIComponent(params.variant)}
      moduleName={decodeURIComponent(params.moduleName)}
      contractName={decodeURIComponent(params.contractName)}
      contractAddress={decodeURIComponent(params.contractAddress)}
    />
  );
}
