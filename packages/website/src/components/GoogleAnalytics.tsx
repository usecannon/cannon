// components/GoogleAnalytics.js
import Script from 'next/script';

export default function GoogleAnalytics({
  measurementId,
}: {
  measurementId: string;
}) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${measurementId}');
                `}
      </Script>
    </>
  );
}
