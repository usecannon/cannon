import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(() => import('@/features/Settings/SettingsPage'), {
  ssr: false,
});

export default function Settings() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Settings"
        description="Settings"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Settings',
          description: 'Settings',
        }}
      />
      <NoSSR />
    </>
  );
}
