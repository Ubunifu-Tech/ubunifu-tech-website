/** Decorative page backgrounds. Copy, product claims and logo assets stay in HTML. */
export const heroScenes = {
  home: '/editorial/hero-home-v1.webp',
  services: '/editorial/hero-services-v1.webp',
  work: '/editorial/hero-work-v1.webp',
  products: '/editorial/hero-products-v1.webp',
  about: '/editorial/hero-about-v1.webp',
  industries: '/editorial/hero-industries-v1.webp',
  contact: '/editorial/hero-contact-v1.webp',
  journal: '/editorial/hero-journal-v1.webp',
  careers: '/editorial/hero-careers-v1.webp',
  brand: '/editorial/hero-brand-v1.webp',
  privacy: '/editorial/hero-privacy-v1.webp',
} as const;

export type HeroScene = keyof typeof heroScenes;
