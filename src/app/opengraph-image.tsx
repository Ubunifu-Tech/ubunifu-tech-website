import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

// Default Open Graph card, inherited by every route without its own.
export const alt = 'Ubunifu Technologies · digital solutions, built for Tanzania';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Digital solutions agency',
    title: 'Digital solutions, built for Tanzania.',
    subtitle: 'Web, hosting, data, AI, branding, and strategy for organisations across Tanzania.',
  });
}
