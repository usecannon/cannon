import { useRouter } from 'next/router';
import { useLiveReload } from 'next-contentlayer/hooks';
import { allGuides, type Guides } from 'contentlayer/generated';
import { ReactElement } from 'react';
import Layout from '../../../_layout';
import NestedLayout from '../../guideLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { Mdx } from '@/components/mdx-components';

export default function GetStarted() {
  // this only runs during development and has no impact on production
  useLiveReload();
  const router = useRouter();
  const guide = allGuides.find(
    (guide) => guide._raw.flattenedPath === router.query.section
  );

  if (!guide) return { notFound: true };

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Get Started"
        description="Get Started"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Get Started',
          description: `Get Started`,
        }}
      />
      <Mdx code={guide.body.code} />
    </>
  );
}

GetStarted.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
