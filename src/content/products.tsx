// Software products shown across the product page and homepage.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.
//
// Product visuals are kept separate from this factual content. Marketing pages
// use open product rows; names, statuses, capabilities,
// and live links remain accessible HTML rather than simulated interfaces.

export type ProductStatus = 'live' | 'soon' | 'available';
export type ProductId = 'insight' | 'sifa' | 'rafiki';

export type Product = {
  id: ProductId;
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
    id: 'insight',
    name: 'Ubunifu Insight',
    tagline: 'Ask questions about your documents',
    description:
      'Upload your contracts, reports, lesson plans, or tax invoices, then ask questions, extract structured data, or generate new documents from your own templates. It includes specialised AI agents, including an Education Tutor that teaches in Swahili.',
    features: [
      'Document answers with source references',
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
    id: 'sifa',
    name: 'Ubunifu Sifa',
    tagline: 'Run your shop, restaurant, or distributor',
    description:
      'Manage sales, stock, suppliers, customers, and unpaid balances in Tanzanian shillings.',
    features: [
      'Sales & POS',
      'Inventory with low-stock alerts',
      'Customer balances grouped by age',
      'Supplier & customer management',
      'Records in Tanzanian shillings',
    ],
    status: 'live',
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Open Sifa',
  },
  {
    id: 'rafiki',
    name: 'Ubunifu Rafiki',
    tagline: 'Embeddable tools for your website',
    description:
      'We’re developing contact forms, booking widgets, and blog tools for existing websites.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools'],
    status: 'soon',
    url: null,
    domain: 'rafiki.ubunifutech.com',
    cta: 'Coming soon',
  },
];
