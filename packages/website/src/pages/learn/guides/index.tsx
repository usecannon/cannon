import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import Layout from '../_layout';
import GuideLayout from './guideLayout';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router
      .push(`${links.GETSTARTED}/setup`)
      .then(() => {
        // do nothing
      })
      .catch(() => {
        // do nothing
      });
  }, [router]);

  return (
    <>
    </>
  );
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <GuideLayout>{page}</GuideLayout>
    </Layout>
  );
};
