import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/DeploymentTab');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Deployment({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  return <NoSSR name={params.name} tag={params.tag} variant={params.variant} />;
}
