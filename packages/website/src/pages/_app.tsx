'use client';

import { Footer } from '@/features/Footer/Footer';
import { Header } from '@/features/Header/Header';
import { Analytics } from '@vercel/analytics/react';
import NextTopLoader from 'nextjs-toploader';
import { Inter, Miriam_Libre, Roboto_Mono, Outfit } from 'next/font/google';
import { ReactElement, useEffect } from 'react';
import Providers from './_providers';
import { DefaultSeo } from 'next-seo';
import '@/styles/globals.css';
import defaultSEO from '@/constants/defaultSeo';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const NoSsrE2EWalletConnector = dynamic(
  () => import('../../cypress/utils/E2EWalletConnector'),
  {
    ssr: false,
  }
);

const miriam = Miriam_Libre({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['200', '400', '500', '600', '700'],
  display: 'swap',
});
const mono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export default function RootLayout({
  Component,
  pageProps,
}: {
  Component: any;
  pageProps: any;
}) {
  const router = useRouter();
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
  const isHomePage = router.pathname === '/';

  useEffect(() => {
    document.body.classList.remove('fouc-prevention');
  }, []);

  return (
    <>
      <DefaultSeo {...defaultSEO} />
      <style jsx global>
        {`
          :root {
            --font-miriam: ${miriam.style.fontFamily};
            --font-inter: ${inter.style.fontFamily};
            --font-mono: ${mono.style.fontFamily};
            --font-outfit: ${outfit.style.fontFamily};
          }
        `}
      </style>
      <NextTopLoader
        color="#00A7CC"
        shadow="0 0 10px #00A7CC,0 0 5px #00A7CC"
        showSpinner={false}
        height={1}
      />
      <Providers>
        <div className="flex flex-col bg-black min-h-screen relative">
          <Header />
          <div
            className="flex flex-1 z-[1] pb-[80px]"
            style={{ paddingBottom: isHomePage ? '80px' : 0 }}
          >
            {getLayout(<Component {...pageProps} />)}
          </div>
          <Footer isFixed={isHomePage} />
          <NoSsrE2EWalletConnector />
        </div>
      </Providers>
      <Analytics />
    </>
  );
}
