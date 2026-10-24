import dynamic from 'next/dynamic';
import { usePackageUrlParams } from '@/hooks/routing/usePackageUrlParams';

const NoSSRPackageByNamePage = dynamic(
  async () => {
    return import('@/features/Packages/PackageByNamePage');
  },
  {
    ssr: false,
  }
);

export default function Deployment() {
  const { name } = usePackageUrlParams();
  return (
    <>
      <NoSSRPackageByNamePage name={name} />
    </>
  );
}
