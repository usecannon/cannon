import { NextPageContext } from 'next';
import { NextSeo } from 'next-seo';
import { useLiveReload } from 'next-contentlayer/hooks';
import { allGuides, type Guides } from 'contentlayer/generated';
import { ReactElement } from 'react';
import Layout from '../../../_layout';
import NestedLayout from '../../guideLayout';
import defaultSEO from '@/constants/defaultSeo';
import { Mdx } from '@/components/mdx-components';
import { DocsNav } from '@/components/docs';

export default function GetStarted({ guide }: { guide: Guides }) {
  // this only runs during development and has no impact on production
  useLiveReload();

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

GetStarted.getInitialProps = async (ctx: NextPageContext) => {
  const guide = await allGuides.find(
    (guide: Guides) => guide._raw.flattenedPath === ctx.query.section
  );

  return { guide: guide || 'introduction' };
};

GetStarted.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
