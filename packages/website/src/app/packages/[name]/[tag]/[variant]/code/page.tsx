import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Package | Code',
  description: 'Package | Code',
  openGraph: {
    title: 'Cannon | Package',
    description: 'Package',
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

export default function Code() {
  return <></>;
}
