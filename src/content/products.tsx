// Software products shown across the product page and homepage.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.
//
// Product visuals are kept separate from this factual content. Marketing pages
// use one clearly labelled conceptual illustration for the product family;
// names, statuses, capabilities, and live links remain accessible HTML.

export type ProductStatus = 'live' | 'soon' | 'available';

export type Product = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  status: ProductStatus;
  url: string | null;
  domain: string;
  cta: string;
};

export const products: ReadonlyArray<Product> = [
  {
    name: 'Ubunifu Insight',
    tagline: 'Document AI, built for here',
    description:
      'Upload your contracts, reports, lesson plans, or tax invoices, then ask questions, extract structured data, or generate new documents from your own templates. It includes specialised AI agents, including an Education Tutor that teaches in Swahili.',
    features: [
      'RAG chat with citations',
      'Data extraction from PDFs',
      'Tanzania-localised templates',
      'Multilingual AI agents',
      'Pay-as-you-go credits',
    ],
    status: 'live',
    url: 'https://insight.ubunifutech.com',
    domain: 'insight.ubunifutech.com',
    cta: 'Open Insight',
  },
  {
    name: 'Ubunifu Sifa',
    tagline: 'Run your shop, restaurant, or distributor',
    description:
      'Sales, inventory, suppliers, customers, and credit management in one app. Selling on credit is a core workflow, with aging buckets that make outstanding balances easier to review. Records are native to TZS.',
    features: [
      'Sales & POS',
      'Inventory with low-stock alerts',
      'Credit ledger with aging buckets',
      'Supplier & customer management',
      'TZS-native records',
    ],
    status: 'live',
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Visit Sifa',
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Embeddable tools for your website',
    description:
      'Drop-in widgets for the basics: contact forms, booking systems, and blog tools. For when you have a site already and just need the working parts.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools'],
    status: 'soon',
    url: null,
    domain: 'rafiki.ubunifutech.com',
    cta: 'Coming soon',
  },
];
