import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

// Default Open Graph card, inherited by every route without its own.
export const alt = 'Ubunifu Technologies — software for Africa';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Software for Africa',
    title: 'We build software for Africa.',
    subtitle: 'Two live SaaS products and custom builds for businesses across Tanzania.',
  });
}
