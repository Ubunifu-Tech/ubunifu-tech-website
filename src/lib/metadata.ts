import type { Metadata } from 'next';

const SITE_URL = 'https://ubunifutech.com';
const SITE_NAME = 'Ubunifu Technologies';

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | '/';
};

export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = new URL(path, SITE_URL).toString();
  const socialTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [
        {
          url: `${SITE_URL}/og.png`,
          width: 1672,
          height: 941,
          alt: 'Ubunifu Technologies — consulting and products, built in Tanzania.',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [`${SITE_URL}/og.png`],
    },
  };
}
