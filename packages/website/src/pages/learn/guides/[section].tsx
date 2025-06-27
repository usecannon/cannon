import { ReactElement, useState, useEffect } from 'react';
import { NextSeo } from 'next-seo';
import { allGuides, type Guides } from 'contentlayer/generated';
import defaultSEO from '@/constants/defaultSeo';
import { Mdx } from '@/components/mdx-components';
import { DocsNav } from '@/components/docs';
import Custom404 from '@/pages/404';
import Layout from '../_layout';
import NestedLayout from './guideLayout';
import { useRouter } from 'next/router';

export default function GuidePage() {
  const [guide, setGuide] = useState<Guides | null>(null);
  const { asPath } = useRouter();

  useEffect(() => {
    const guide = allGuides.find((guide: Guides) => {
      return guide.url.split('/').pop() === asPath.split('/').pop();
    });

    if (!guide) setGuide(null);
    else setGuide(guide);
  }, [asPath]);

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={`Cannon | Guides | ${guide?.title}`}
        description={guide?.description}
        openGraph={{
          ...defaultSEO.openGraph,
          title: `Cannon | Guides | ${guide?.title}`,
          description: guide?.description,
        }}
      />
      {guide ? (
        <div className="max-w-3xl px-4 py-10">
          <Mdx code={guide.body.code} />
          <DocsNav guide={guide} />
        </div>
      ) : (
        <div className="py-10">
          <Custom404 text="Guide not found" />
        </div>
      )}
    </>
  );
}

GuidePage.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
