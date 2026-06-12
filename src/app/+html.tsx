import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML document for the static web export (runs only in Node at build
 * time, wraps every route). This is where web <head> metadata lives: the page
 * title, PWA manifest, and the "Add to Home Screen" / apple-touch icons that
 * make the web app install with the real Cup Live football icon and name.
 *
 * Asset links are prefixed with the deployment base ("/cup-live-2026") so they
 * resolve on GitHub Pages; public/ files are copied to that root on export.
 */
const BASE = process.env.EXPO_BASE_URL ?? '';
const SITE_URL = 'https://shahzaibbaig123.github.io/cup-live-2026/';
const DESCRIPTION =
  'Live FIFA World Cup 2026 scores, full schedule, group standings and AI match predictions.';
const THEME = '#0A0F1A';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Cup Live 2026 — World Cup Live Scores & Predictions</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content={THEME} />

        {/* PWA / install */}
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Cup Live" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Link previews (LinkedIn / WhatsApp / iMessage) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Cup Live 2026" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
