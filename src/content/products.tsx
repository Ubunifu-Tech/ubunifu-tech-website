// Software products shown across the product page and homepage.
// Add, remove, or reorder products by editing this list. Components iterate
// over it and don't care about specific products.
//
// Product visuals are kept separate from this factual content. Marketing pages
// use open product rows; names, statuses, capabilities,
// and live links remain accessible HTML rather than simulated interfaces.

export type ProductStatus = 'live' | 'soon' | 'available';
export type ProductId = 'sifa' | 'rafiki';

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
    id: 'sifa',
    name: 'Ubunifu Sifa',
    tagline: 'For shops, restaurants and distributors',
    description:
      'Keep sales, stock, suppliers, customers and unpaid balances in one place.',
    features: [
      'Sales and point of sale',
      'Inventory with low-stock alerts',
      'Customer balances grouped by how long they have been unpaid',
      'Supplier and customer records',
      'Amounts in Tanzanian shillings',
    ],
    status: 'live',
    url: 'https://sifa.ubunifutech.com',
    domain: 'sifa.ubunifutech.com',
    cta: 'Open Sifa',
  },
  {
    id: 'rafiki',
    name: 'Ubunifu Rafiki',
    tagline: 'Tools to add to an existing website',
    description:
      'We are still building these tools.',
    features: ['Contact forms', 'Booking widgets', 'Blog tools'],
    status: 'soon',
    url: null,
    domain: 'rafiki.ubunifutech.com',
    cta: 'Coming soon',
  },
];
