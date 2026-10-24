import { ReactElement } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../_layout';
import PageLoading from '@/components/PageLoading';
import { useRouter } from 'next/router';

const DynamicCannonfilePage = dynamic(
  () => import('@/features/Docs/DocsCannonfilesPage'),
  {
    ssr: false,
  }
);

export default function Docs() {
  const router = useRouter();
  return (
    <>
      {router.isReady ? <DynamicCannonfilePage /> : <PageLoading />}
    </>
  );
}

Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
