import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CodeTab');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Code({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  return <NoSSR name={params.name} tag={params.tag} variant={params.variant} />;
}
