// Software products shown across the product page and homepage.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.
//
// `primary` is an optional screenshot of the live product. Only include real
// screenshots. If the product isn't live or we don't have a screenshot, leave
// `primary` undefined and the card renders a branded placeholder panel.

export type ProductStatus = 'live' | 'soon' | 'available';

export type ProductScreenshot = {
  src: string;
  alt: string;
};

export type Product = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  status: ProductStatus;
  url: string | null;
  domain: string;
  cta: string;
  primary?: ProductScreenshot;
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
    cta: 'Try Insight',
    primary: {
      src: '/work/insight-generator.png',
      alt: 'Insight Document Generator template gallery, including a Tanzania Tax Invoice template alongside NDAs, SOWs, lesson plans and offer letters',
    },
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
    cta: 'Start free',
    primary: {
      src: '/work/sifa-dashboard.png',
      alt: 'Sifa Intelligence Dashboard for Mama Amina Duka, showing daily sales, low-stock alerts, outstanding credit and credit aging buckets in TZS',
    },
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
