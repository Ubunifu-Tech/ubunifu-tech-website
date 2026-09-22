import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

/**
 * Minimal root: document, fonts and tokens, nothing else.
 *
 * The marketing chrome — navbar, footer, WhatsApp button, smooth scroll — lives
 * in the (site) group layout instead. The console is served from the same app
 * on a different host, and it must not inherit any of it: those nav links point
 * at marketing routes, which middleware rewrites into /admin/* on the console
 * host and 404s. Staff would have been one click from a dead end on every page.
 *
 * Splitting here rather than reading the host in this layout keeps the
 * marketing pages statically generated. Calling headers() up here would make
 * every public page dynamic.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://ubunifutech.com'),
  title: {
    default: 'Ubunifu Technologies · Technology consulting and products',
    template: '%s | Ubunifu Technologies',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
