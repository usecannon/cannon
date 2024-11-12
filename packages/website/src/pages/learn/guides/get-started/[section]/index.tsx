import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { useLiveReload } from 'next-contentlayer/hooks';
import { allGuides, type Guides } from 'contentlayer/generated';
import { ReactElement } from 'react';
import Layout from '../../../_layout';
import NestedLayout from '../../guideLayout';
import defaultSEO from '@/constants/defaultSeo';
import { Mdx } from '@/components/mdx-components';
import { DocsNav } from '@/components/docs';

export default function GetStarted() {
  // this only runs during development and has no impact on production
  useLiveReload();
  const router = useRouter();
  const guide = allGuides.find(
    (guide: Guides) => guide._raw.flattenedPath === router.query.section
  );

  if (!guide) return router.push('/404');

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Get Started"
        description="Get Started"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Get Started',
          description: 'Get Started',
        }}
      />
      <div className="container max-w-3xl">
        <Mdx code={guide.body.code} />
        <DocsNav guide={guide} />
      </div>
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
