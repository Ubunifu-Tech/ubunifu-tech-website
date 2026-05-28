// Products & services shown on the homepage Products section.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.
//
// `primary` is an optional screenshot of the live product. Only include real
// screenshots — if the product isn't live or we don't have a screenshot, leave
// `primary` undefined and the card renders as a text-only block.

export type ProductStatus = 'live' | 'soon' | 'available';
export type ProductSize = 'featured' | 'wide' | 'default';

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
  size: ProductSize;
  primary?: ProductScreenshot;
};

export const products: ReadonlyArray<Product> = [
  {
    name: 'Ubunifu Insight',
    tagline: 'Document AI, built for here',
    description:
      'Upload your contracts, reports, lesson plans, or tax invoices, then ask questions, extract structured data, or generate new documents from your own templates. Includes specialised AI agents — including an Education Tutor that teaches in Swahili.',
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
    size: 'featured',
    primary: {
      src: '/work/insight-generator.png',
      alt: 'Insight Document Generator template gallery — including a Tanzania Tax Invoice template alongside NDAs, SOWs, lesson plans and offer letters',
    },
  },
  {
    name: 'Ubunifu Sifa',
    tagline: 'Run your shop, restaurant, or distributor',
    description:
      'Sales, inventory, suppliers, customers, and credit management in one app. First-class support for selling on credit, with aging buckets so you know who owes what. Works offline, native to TZS.',
    features: [
      'Sales & POS',
      'Inventory with low-stock alerts',
      'Credit ledger with aging buckets',
      'Supplier & customer management',
      'Works offline',
    ],
    status: 'live',
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Start free',
    size: 'wide',
    primary: {
      src: '/work/sifa-dashboard.png',
      alt: 'Sifa Intelligence Dashboard for Mama Amina Duka, showing daily sales, low-stock alerts, outstanding credit and credit aging buckets in TZS',
    },
  },
  {
    name: 'Ubunifu Rafiki',
    tagline: 'Embeddable tools for your website',
    description:
      'Drop-in widgets for the basics: contact forms, booking widgets, blog tools. For when you have a site already and just need the working parts.',
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
      'When the answer is a custom build, not a SaaS subscription. Websites, custom platforms, AI integrations, data work, and brand design — see Selected work for what that looks like.',
    features: ['Web development', 'Data analytics', 'Brand design', 'AI & automation'],
    status: 'available',
    url: '/build',
    domain: 'ubunifutech.com/build',
    cta: 'Learn more',
    size: 'default',
  },
];
