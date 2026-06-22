import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { SmoothScroll } from '@/components/SmoothScroll';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { services } from '@/content/services';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Ubunifu Technologies · Digital Solutions, Built for Tanzania',
    template: '%s | Ubunifu Technologies',
  },
  description: 'Ubunifu Technologies is a Tanzania-based digital-solutions agency. Web development, hosting, domain management, professional email, data analytics, intelligent automation, branding, and digital strategy for businesses and organisations across Tanzania.',
  keywords: [
    'SaaS Tanzania',
    'software Africa',
    'AI platform Tanzania',
    'Ubunifu Insight',
    'Ubunifu Sifa',
    'Ubunifu Build',
    'web development Tanzania',
    'web hosting Tanzania',
    'domain registration Tanzania',
    'business email Tanzania',
    'graphic design Tanzania',
    'logo design Tanzania',
    'business software Tanzania',
    'software Arusha',
    'consulting Tanzania',
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
    title: 'Ubunifu Technologies · Digital Solutions, Built for Tanzania',
    description: 'A Tanzania-based digital-solutions agency: web, hosting, data, AI, branding, and digital strategy.',
    // OG image is provided by the file-based opengraph-image.tsx convention
    // (src/app/opengraph-image.tsx and per-route overrides).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ubunifu Technologies · Digital Solutions, Built for Tanzania',
    description: 'A Tanzania-based digital-solutions agency: web, hosting, data, AI, branding, and digital strategy.',
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
    description: 'A Tanzania-based digital-solutions agency: web, hosting, data, AI, branding, and digital strategy.',
    url: 'https://ubunifutech.com',
    logo: 'https://ubunifutech.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+255-748-548-816',
      contactType: 'customer service',
      email: 'info@ubunifutech.com',
      areaServed: 'TZ',
      availableLanguage: ['English'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TZ',
      addressRegion: 'Arusha',
    },
    founder: {
      '@type': 'Person',
      name: 'Richard Pallangyo',
      jobTitle: 'Data & AI Builder',
    },
    products: [
      'Ubunifu Insight',
      'Ubunifu Sifa',
      'Ubunifu Build',
    ],
    // Machine-readable list of the service pillars, kept in sync with
    // src/content/services.tsx (the same source the /build page renders).
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.title,
          description: service.summary,
        },
      })),
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable}`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SmoothScroll>
          <Navbar />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Footer />
          <WhatsAppButton />
        </SmoothScroll>
      </body>
    </html>
  );
}
