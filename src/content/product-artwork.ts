import type { ProductId } from './products';

type ProductArtwork = {
  src: string;
  alt: string;
};

/** Editorial concepts only; live capabilities and availability stay in products.tsx. */
export const productArtwork: Record<ProductId, ProductArtwork> = {
  insight: {
    src: '/editorial/product-insight-v1.webp',
    alt: 'Illustration of source documents connected to an extracted answer sheet.',
  },
  sifa: {
    src: '/editorial/product-sifa-v1.webp',
    alt: 'Illustration connecting stock cartons, a sales receipt and an account ledger.',
  },
  rafiki: {
    src: '/editorial/product-rafiki-v1.webp',
    alt: 'Illustration of contact, booking and publishing modules fitting into a website.',
  },
};
