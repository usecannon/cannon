'use client';

import { Analytics } from '@vercel/analytics/react';
import Document, {
  DocumentContext,
  Html,
  Head,
  Main,
  NextScript,
} from 'next/document';

import { GoogleAnalytics } from '@next/third-parties/google';

export default class CustomDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      styles: [initialProps.styles],
    };
  }

  render() {
    return (
      <Html lang="en" className="dark">
        <Head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body>
          <Main />
          <NextScript />
          <Analytics />
        </body>
        <GoogleAnalytics gaId="G-C96791F6NC" />
      </Html>
    );
  }
}
