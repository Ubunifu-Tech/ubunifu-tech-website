import type { ProductId } from './products';

type ProductArtwork = {
  src: string;
  alt: string;
};

/** Editorial concepts only; live capabilities and availability stay in products.tsx. */
export const productArtwork: Record<ProductId, ProductArtwork> = {
  insight: {
    src: '/editorial/product-insight-v2.webp',
    alt: 'A professional reviews answers connected back to several source documents.',
  },
  sifa: {
    src: '/editorial/product-sifa-v2.webp',
    alt: 'A small business team connects sales, stock, customers, and account records.',
  },
  rafiki: {
    src: '/editorial/product-rafiki-v2.webp',
    alt: 'A team fits contact, booking, and publishing modules into a website.',
  },
};
