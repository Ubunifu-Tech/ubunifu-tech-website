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
    default: 'Ubunifu Technologies | Software for Africa',
    template: '%s | Ubunifu Technologies',
  },
  description: 'Ubunifu Technologies builds SaaS products for African businesses. Our first product, Ubunifu Insight, is an AI-powered document intelligence platform built for teams in Tanzania and across Africa.',
  keywords: [
    'digital transformation Tanzania',
    'web development Tanzania',
    'data analytics Tanzania',
    'AI solutions Tanzania',
    'brand design Tanzania',
    'business intelligence Tanzania',
    'digital consulting Tanzania',
    'web design Dar es Salaam',
    'software development Tanzania',
    'machine learning Tanzania',
    'strategic consulting East Africa',
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
    title: 'Ubunifu Technologies | Software for Africa',
    description: 'Tanzania-based digital transformation and strategic consulting firm. Technology. Strategy. Results.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Ubunifu Technologies - Digital Transformation & Strategic Consulting',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ubunifu Technologies | Software for Africa',
    description: 'Tanzania-based digital transformation firm. Web development, AI, data analytics, brand design.',
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
      email: 'richardpallangyo@ubunifutech.com',
      areaServed: 'TZ',
      availableLanguage: ['English', 'Swahili'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TZ',
      addressRegion: 'Dar es Salaam',
    },
    sameAs: [
      // Add social media profiles when available
      // 'https://linkedin.com/company/ubunifu-technologies',
      // 'https://twitter.com/ubunifutech',
    ],
    founder: {
      '@type': 'Person',
      name: 'Richard Pallangyo',
      jobTitle: 'Founder & Lead Data Scientist',
    },
    services: [
      'Web Development',
      'Data Analytics',
      'AI Solutions',
      'Brand Design',
      'Digital Strategy',
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
