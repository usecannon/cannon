import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

import TagVariantLayout from '../NameTagVariantLayout';
import { ReactElement } from 'react';

const DeploymentTab = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/DeploymentTab');
  },
  {
    ssr: false,
  }
);

export default function Deployment() {
  const params = useRouter().query;
  return (
    <>
      <DeploymentTab
        name={decodeURIComponent(params.name as string)}
        tag={decodeURIComponent(params.tag as string)}
        variant={decodeURIComponent(params.variant as string)}
      />
    </>
  );
}

Deployment.getLayout = function getLayout(page: ReactElement) {
  return <TagVariantLayout>{page}</TagVariantLayout>;
};
