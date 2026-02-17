import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'U — Ubunifu Technologies · Software for Africa',
    template: '%s · Ubunifu Technologies',
  },
  description: 'Ubunifu Technologies builds SaaS products for African businesses. Our first product, Ubunifu Insight, is an AI-powered document intelligence platform built for teams in Tanzania and across Africa.',
  keywords: [
    'SaaS Tanzania',
    'software Africa',
    'AI platform Tanzania',
    'document intelligence Tanzania',
    'Ubunifu Insight',
    'business software Tanzania',
    'software Arusha',
    'African SaaS',
    'data analytics Tanzania',
    'AI Tanzania',
  ],
  authors: [{ name: 'Ubunifu Technologies' }],
  creator: 'Ubunifu Technologies',
  publisher: 'Ubunifu Technologies',
  metadataBase: new URL('https://ubunifutech.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ubunifutech.com',
    siteName: 'Ubunifu Technologies',
    title: 'U — Ubunifu Technologies · Software for Africa',
    description: 'Ubunifu Technologies builds SaaS products for African businesses. Ubunifu Insight — AI-powered document intelligence for teams in Tanzania.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Ubunifu Technologies - Software for Africa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'U — Ubunifu Technologies · Software for Africa',
    description: 'Ubunifu Technologies builds SaaS products for African businesses. Ubunifu Insight — AI-powered document intelligence for teams in Tanzania.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification when ready
    // google: 'your-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ubunifu Technologies',
    description: 'SaaS product company building software for Africa',
    url: 'https://ubunifutech.com',
    logo: 'https://ubunifutech.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+255-765-948-816',
      contactType: 'customer service',
      email: 'info@ubunifutech.com',
      areaServed: 'TZ',
      availableLanguage: ['English', 'Swahili'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TZ',
      addressRegion: 'Arusha',
    },
    sameAs: [
      // Add social media profiles when available
      // 'https://linkedin.com/company/ubunifu-technologies',
      // 'https://twitter.com/ubunifutech',
    ],
    founder: {
      '@type': 'Person',
      name: 'Richard Pallangyo',
      jobTitle: 'Founder & CEO',
    },
    products: [
      'Ubunifu Insight',
      'Ubunifu Rafiki',
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable}`}>{children}</body>
    </html>
  );
}
