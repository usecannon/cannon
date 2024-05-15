//import { Metadata } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';

/*export const metadata: Metadata = {
  title: 'Cannon | Guides',
  description: 'Guides',
  openGraph: {
    title: 'Cannon | Guides',
    description: 'Guides',
  },
  };*/

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router
      .push(links.GETSTARTED)
      .then(() => {
        // do nothing
      })
      .catch(() => {
        // do nothing
      });
  }, []);
}
