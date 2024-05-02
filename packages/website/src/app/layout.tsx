'use client';

import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Console } from '@/features/Console/Console';
import { Footer } from '@/features/Footer/Footer';
import { Header } from '@/features/Header/Header';
import { Flex } from '@chakra-ui/react';
import { Analytics } from '@vercel/analytics/react';
import { Inter, Miriam_Libre, Roboto_Mono } from 'next/font/google';
import { ReactNode } from 'react';
import { Providers } from './providers';
import '@/styles/globals.css';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics measurementId="G-C96791F6NC" />
      </head>
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
      <body>
        <Providers>
          <Flex
            flexDirection="column"
            backgroundColor="gray.900"
            minHeight="100vh"
            position="relative"
          >
            <Header />
            <Flex flex="1">{children}</Flex>
            <Footer />
            <Console />
          </Flex>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
