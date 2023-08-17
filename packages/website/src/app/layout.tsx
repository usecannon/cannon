'use client';

import { Providers } from './providers';
import { Miriam_Libre, Inter, Roboto_Mono } from 'next/font/google';
import { Box } from '@chakra-ui/react';
import { Header } from '@/features/Header/Header';
import { GithubFooter } from '@/features/Footer/GithubFooter';
import { ReactNode } from 'react';

const miriam = Miriam_Libre({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
          <Box backgroundColor="gray.900" minHeight="100vh">
            <Header />
            <Box minH="calc(100vh - 165px)">{children}</Box>
            <GithubFooter />
          </Box>
        </Providers>
      </body>
    </html>
  );
}
