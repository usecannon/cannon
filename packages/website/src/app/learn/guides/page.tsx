import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { links } from '@/constants/links';

export const metadata: Metadata = {
  title: 'Cannon | Guides',
  description: 'Guides',
  openGraph: {
    title: 'Cannon | Guides',
    description: 'Guides',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default async function Home() {
  redirect(links.GETSTARTED);
}
