'use client';

import { Footer } from '@/features/Footer/Footer';
import { Header } from '@/features/Header/Header';
import { Flex } from '@chakra-ui/react';
import { Analytics } from '@vercel/analytics/react';
import NextTopLoader from 'nextjs-toploader';
import { Inter, Miriam_Libre, Roboto_Mono } from 'next/font/google';
import { ReactElement, useEffect } from 'react';
import Providers from './_providers';
import { DefaultSeo } from 'next-seo';
import '@/styles/globals.css';
import defaultSEO from '@/constants/defaultSeo';
import E2EWalletConnector from '../../cypress/utils/E2EWalletConnector';

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

export default function RootLayout({
  Component,
  pageProps,
}: {
  Component: any;
  pageProps: any;
}) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

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
          }
          *:focus {
            outline: none;
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
        <Flex
          flexDirection="column"
          backgroundColor="black"
          minHeight="100vh"
          position="relative"
        >
          <Header />
          <Flex flex="1">{getLayout(<Component {...pageProps} />)}</Flex>
          <Footer />
          {/*<Console />*/}
          <E2EWalletConnector />
        </Flex>
      </Providers>
      <Analytics />
    </>
  );
}
