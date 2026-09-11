// Site-wide configuration - single source of truth for company info,
// contact details, and navigation. Edit here, not in components.

export const site = {
  name: 'Ubunifu Technologies',
  tagline: 'Consulting + products, built in Tanzania.',
  shortDescription:
    'A Tanzanian technology consultancy that also builds and operates products across brand, software, data, and AI.',
  location: 'Tanzania',

  contact: {
    email: 'info@ubunifutech.com',
    phone: '+255 748 548 816',
    phoneTel: '+255748548816',
    whatsapp: '255748548816', // wa.me format (no +)
  },

  urls: {
    home: 'https://ubunifutech.com',
    insight: 'https://insight.ubunifutech.com',
    sifa: 'https://sifa.ubunifutech.com',
    products: '/products',
    services: '/build',
    work: '/work',
    about: '/about',
    contact: '/contact',
    blog: '/blog',
    careers: '/careers',
  },
} as const;

// Calls to action - one wording per action, site-wide. Import these instead of
// typing a button label, so the primary conversion path cannot drift again.
export const cta = {
  /** Anything that sends someone to /contact. */
  primary: 'Start a project',
  /** Anything that sends someone to /work. */
  secondary: 'See our work',
} as const;

// Navigation links - order = display order.
export const navLinks: ReadonlyArray<{
  label: string;
  href: string;
  badge?: string;
}> = [
  { label: 'Services', href: '/build' },
  { label: 'Work', href: '/work' },
  { label: 'Products', href: '/products' },
  { label: 'Insights', href: '/blog' },
  { label: 'About', href: '/about' },
];

// Footer columns - edit titles, links, or order without touching Footer.tsx.
export const footerColumns: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{
    label: string;
    href: string;
    external?: boolean;
    soon?: boolean;
  }>;
}> = [
  {
    title: 'Products',
    links: [
      { label: 'Ubunifu Insight', href: 'https://insight.ubunifutech.com', external: true },
      { label: 'Ubunifu Sifa', href: 'https://sifa.ubunifutech.com', external: true },
      { label: 'Ubunifu Rafiki', href: '#', soon: true },
      { label: 'All products', href: '/products' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Web & Apps', href: '/build#web' },
      { label: 'Hosting & Email', href: '/build#hosting' },
      { label: 'Branding', href: '/build#branding' },
      { label: 'Data & BI', href: '/build#data' },
      { label: 'AI & Automation', href: '/build#ai' },
      { label: 'Strategy', href: '/build#strategy' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'All services', href: '/build' },
      { label: 'Industries', href: '/industries' },
      { label: 'Our Work', href: '/work' },
      { label: 'About', href: '/about' },
      { label: 'Insights', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];
