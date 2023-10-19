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
      name={params.name}
      tag={params.tag}
      variant={params.variant}
      moduleName={params.moduleName}
      contractName={params.contractName}
      contractAddress={params.contractAddress}
    />
  );
}
