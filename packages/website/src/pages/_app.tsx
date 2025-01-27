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
import InstallDialog from '@/components/InstallDialog';

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
  const isFooterFixed =
    router.pathname == '/' || router.pathname == '/packages';

  const headerVar = 'var(--header-height)';
  const footerVar = 'var(--footer-height)';

  const cannonMainStyles = {
    minHeight: isFooterFixed
      ? `calc(100vh - ${headerVar} - ${footerVar})`
      : 'auto',
  };

  const layoutStyles = {
    minHeight: isFooterFixed
      ? 'auto'
      : `calc(100vh - ${headerVar} - ${footerVar})`,
    paddingBottom: isFooterFixed ? footerVar : '0',
  };

  useEffect(() => {
    document.body.classList.remove('fouc-prevention');
  }, []);

  return (
    <div>
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
        <Header />

        <div className={'cannon-main'} style={cannonMainStyles}>
          <div className={'cannon-layout flex relative'} style={layoutStyles}>
            {getLayout(<Component {...pageProps} />)}
            <NoSsrE2EWalletConnector />
          </div>
        </div>

        <Footer isFixed={isFooterFixed} />
      </Providers>
      <Analytics />
      <InstallDialog />
    </div>
  );
}
