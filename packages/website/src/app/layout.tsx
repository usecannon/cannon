'use client';

import { Providers } from './providers';
import { Miriam_Libre, Inter, Roboto_Mono } from 'next/font/google';
import { Flex } from '@chakra-ui/react';
import { Header } from '@/features/Header/Header';
import { Footer } from '@/features/Footer/Footer';
import { Console } from '@/features/Console/Console';
import { Analytics } from '@vercel/analytics/react';
import { ReactNode, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useStore } from '@/helpers/store';
import { parse as parseUrl } from 'simple-url';

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

async function isIpfsGateway(ipfsUrl: string) {
  let isGateway = true;
  try {
    ipfsUrl = ipfsUrl.endsWith('/') ? ipfsUrl : ipfsUrl + '/';
    const parsedUrl = parseUrl(ipfsUrl);
    const headers: { [k: string]: string } = {};

    if (parsedUrl.auth) {
      const [username, password] = parsedUrl.auth.split(':');
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
    }
    await axios.post(ipfsUrl + 'api/v0/cat', null, {
      headers,
      timeout: 15 * 1000,
    });
  } catch (err: unknown) {
    if (
      err instanceof AxiosError &&
      err.response?.status === 400 &&
      err.response?.data.includes('argument "ipfs-path" is required')
    ) {
      isGateway = false;
    }
  }

  return isGateway;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  useEffect(() => {
    async function fetch() {
      setSettings({
        isIpfsGateway: await isIpfsGateway(settings.ipfsApiUrl),
      });
    }

    void fetch();
  }, [settings.ipfsApiUrl]);

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
          <Flex
            flexDirection="column"
            backgroundColor="gray.900"
            minHeight="100vh"
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
