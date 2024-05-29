'use client';

import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Analytics } from '@vercel/analytics/react';
import { ColorModeScript } from '@chakra-ui/react';
import createEmotionServer from '@emotion/server/create-instance';
import Document, {
  DocumentContext,
  Html,
  Head,
  Main,
  NextScript,
} from 'next/document';

import emotionCache from '@/lib/emotion-cache';

const { extractCritical } = createEmotionServer(emotionCache);

export default class CustomDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const styles = extractCritical(initialProps.html);
    return {
      ...initialProps,
      styles: [
        initialProps.styles,
        <style
          key="emotion-css"
          dangerouslySetInnerHTML={{ __html: styles.css }}
          data-emotion-css={styles.ids.join(' ')}
        />,
      ],
    };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <GoogleAnalytics measurementId="G-C96791F6NC" />
          <style>{`
            body {
              background-color: rgb(14, 17, 22);
            }
          `}</style>
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </Head>
        <body>
          <ColorModeScript />
          <Main />
          <NextScript />
          <Analytics />
        </body>
      </Html>
    );
  }
}
