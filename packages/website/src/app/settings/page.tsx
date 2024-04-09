import { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Cannon | Settings',
  description: 'Settings',
  openGraph: {
    title: 'Cannon | Settings',
    description: 'Settings',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

const NoSSR = dynamic(() => import('@/features/Settings/SettingsPage'), {
  ssr: false,
});

export default function Settings() {
  return <NoSSR />;
}
