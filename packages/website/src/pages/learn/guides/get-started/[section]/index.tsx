import { NextPageContext } from 'next';
import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import { allGuides, type Guides } from 'contentlayer/generated';
import defaultSEO from '@/constants/defaultSeo';
import { Mdx } from '@/components/mdx-components';
import { DocsNav } from '@/components/docs';
import Custom404 from '@/pages/404';
import Layout from '../../../_layout';
import NestedLayout from '../../guideLayout';

export default function GetStarted({ guide }: { guide: Guides }) {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={`Cannon | Get Started | ${guide?.title}`}
        description={guide?.description}
        openGraph={{
          ...defaultSEO.openGraph,
          title: `Cannon | Get Started | ${guide?.title}`,
          description: guide?.description,
        }}
      />
      {guide ? (
        <div className="container max-w-3xl pt-10">
          <Mdx code={guide.body.code} />
          <DocsNav guide={guide} />
        </div>
      ) : (
        <div className="pt-10">
          <Custom404 text="Guide not found" />
        </div>
      )}
    </>
  );
}

GetStarted.getInitialProps = async (ctx: NextPageContext) => {
  const guide = await allGuides.find(
    (guide: Guides) => guide._raw.flattenedPath === ctx.query.section
  );

  return { guide: guide };
};

GetStarted.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
