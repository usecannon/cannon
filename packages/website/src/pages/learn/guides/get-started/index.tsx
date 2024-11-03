import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../guideLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { NextPageContext } from 'next';
import {
  Introduction,
  CreatingAProject,
  Example,
} from '@/lib/guides/get-started';

type SectionProps = 'introduction' | 'example';

export default function GetStarted({
  section = 'introduction',
}: {
  section: SectionProps;
}) {
  const guides: { [key: string]: () => React.ReactNode } = {
    example: () => <Example />,
    introduction: () => <Introduction />,
    'creating-a-project': () => <CreatingAProject />,
  };

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Get Started"
        description="Get Started"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Get Started',
          description: `Get Started - ${section}`,
        }}
      />
      <div className="container max-w-3xl">{guides[section]()}</div>
    </>
  );
}

GetStarted.getInitialProps = async (ctx: NextPageContext) => {
  return { section: ctx.query.section };
};

GetStarted.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
