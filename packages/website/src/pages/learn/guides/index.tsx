import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';
import Layout from '../_layout';
import GuideLayout from './guideLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

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
      <NextSeo
        {...defaultSEO}
        title="Cannon | Guides"
        description="Guides"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Guides',
          description: 'Guides',
        }}
      />
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
