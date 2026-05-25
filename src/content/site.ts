// Site-wide configuration - single source of truth for company info,
// contact details, and navigation. Edit here, not in components.

export const site = {
  name: 'Ubunifu Technologies',
  tagline: 'Building software for Africa.',
  shortDescription: 'Software products and consulting for African businesses.',
  location: 'Arusha, Tanzania',

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
    contact: '/#contact',
    blog: '/blog',
    careers: '/careers',
  },
} as const;

// Navigation links - order = display order.
export const navLinks: ReadonlyArray<{
  label: string;
  href: string;
  badge?: string;
}> = [
  { label: 'Services', href: '/build' },
  { label: 'Products', href: '/products' },
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
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
    title: 'Company',
    links: [
      { label: 'Services', href: '/build' },
      { label: 'Our Work', href: '/work' },
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
    ],
  },
];
