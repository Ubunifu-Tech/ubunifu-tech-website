// Products & services shown on the homepage Products section.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.

export type ProductStatus = 'live' | 'soon' | 'available';
export type ProductSize = 'featured' | 'wide' | 'default';

export type Product = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  status: ProductStatus;
  url: string | null;
  domain: string;
  cta: string;
  size: ProductSize;
};

export const products: ReadonlyArray<Product> = [
  {
    name: 'Ubunifu Insight',
    tagline: 'Document AI for your team',
    description:
      'Upload documents, ask questions in plain language, and get accurate answers with citations. Extract structured data, generate reports, and build a searchable knowledge base.',
    features: ['RAG-powered Q&A', 'Data extraction', 'Document generation', 'Team workspaces', 'Pay as you go'],
    status: 'live',
    url: 'https://insight.ubunifutech.com',
    domain: 'insight.ubunifutech.com',
    cta: 'Try Insight',
    size: 'featured',
  },
  {
    name: 'Ubunifu Sifa',
    tagline: 'Business management for Tanzanian SMBs',
    description:
      'Sales, inventory, employee management, and real-time reports, all in one platform. Works offline on any phone.',
    features: ['Sales & POS', 'Inventory tracking', 'Employee scheduling', 'Credit management', 'Free plan available'],
    status: 'live',
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Start Free',
    size: 'wide',
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Business tools for your website',
    description:
      'Embeddable widgets: contact forms, booking systems, and blog tools for any business.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools'],
    status: 'soon',
    url: null,
    domain: 'rafiki.ubunifutech.com',
    cta: 'Coming soon',
    size: 'default',
  },
  {
    name: 'Ubunifu Build',
    tagline: 'Custom software & consulting',
    description:
      'Websites, data solutions, and digital strategy, from a single page to a full platform.',
    features: ['Web development', 'Data analytics', 'Brand design', 'AI & automation'],
    status: 'available',
    url: '/build',
    domain: 'ubunifutech.com/build',
    cta: 'Learn more',
    size: 'default',
  },
];
