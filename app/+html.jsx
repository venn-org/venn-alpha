import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* Venn is light-only for now — stop mobile browsers (Android "Force dark" /
            auto-dark-theme-for-web-content) from inverting the page's colors. */}
        <meta name="color-scheme" content="light only" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
