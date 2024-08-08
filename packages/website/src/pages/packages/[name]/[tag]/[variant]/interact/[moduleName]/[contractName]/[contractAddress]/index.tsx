import dynamic from 'next/dynamic';
import { ReactElement } from 'react';

import InteractLayout from '../../../../_layout';
import ModuleLayout from '../../../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSRInteract = dynamic(() => import('@/features/Packages/Interact'), {
  ssr: false,
});

export default function Interact() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Package | Code"
        description="Package | Code"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Package',
          description: 'Package',
        }}
      />
      <NoSSRInteract />
    </>
  );
}
Interact.getLayout = function getLayout(page: ReactElement) {
  return (
    <InteractLayout>
      <ModuleLayout>{page}</ModuleLayout>
    </InteractLayout>
  );
};
