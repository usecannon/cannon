import { Metadata } from 'next';
import { DocsLandingPage } from '@/features/Docs/DocsLandingPage';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
  description: 'Docs',
  openGraph: {
    title: 'Cannon | Docs',
    description: 'Docs',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://usecannon.com/images/og.png',
      },
    ],
  },
};

export default function Docs() {
  return <DocsLandingPage />;
}
