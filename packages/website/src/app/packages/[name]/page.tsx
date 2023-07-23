import { Metadata } from 'next';
import { PackagesPage } from '@/features/Packages/PackagesPage';

export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Package({ params }: { params: { name: string } }) {
  return <PackagesPage name={params.name} />;
}
