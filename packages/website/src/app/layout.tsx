'use client';

import { Providers } from './providers';
import { Miriam_Libre, Inter, Roboto_Mono } from 'next/font/google';
import { Box } from '@chakra-ui/react';
import { Header } from '@/Features/Header/Header';
import { GithubFooter } from '@/Features/Footer/GithubFooter';
import { ReactNode } from 'react';

const miriam = Miriam_Libre({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
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
        `}
      </style>
      <body>
        <Providers>
          <Box backgroundColor="blue.950" minHeight="100vh">
            <Header />
            <Box pt={24}>{children}</Box>
            <GithubFooter />
          </Box>
        </Providers>
      </body>
    </html>
  );
}
