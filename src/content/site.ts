// Site-wide configuration - single source of truth for company info,
// contact details, and navigation. Edit here, not in components.

export const site = {
  name: 'Ubunifu Technologies',
  location: 'Tanzania',

  contact: {
    email: 'info@ubunifutech.com',
    phone: '+255 748 548 816',
    phoneTel: '+255748548816',
  },

  // Only `contact` is read (CtaBand). Nav and footer URLs live in navLinks and
  // footerColumns below; product URLs live in content/products.tsx.
  urls: {
    contact: '/contact',
  },
} as const;

// The topics on the contact form, in the order the form lists them. The form's
// select and the contact route's allow-list both read this, so a topic cannot be
// offered without being accepted, or accepted without being offered.
export const contactSubjects = [
  'Project enquiry',
  'Product question',
  'Hosting, domains & email',
  'Branding & design',
  'Support',
  'Partnership',
  'Careers',
  'Other',
] as const;

export type ContactSubject = (typeof contactSubjects)[number];

// What we promise about a reply, in one sentence. The chat's hand-off card, the
// assistant's instructions and its knowledge, the contact form and the
// acknowledgement email all read this, so the promise a visitor is given is the
// same wherever they meet it.
export const replyPromise = 'A person replies by email, usually within a working day.';

// Calls to action - one wording per action, site-wide. Import these instead of
// typing a button label, so the primary conversion path cannot drift again.
export const cta = {
  /** Anything that sends someone to /contact. */
  primary: 'Start a project',
  /** Anything that sends someone to /work. */
  secondary: 'See our work',
  /** Where a client signs in to their project portal. */
  portal: 'Client login',
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
      { label: 'Client login', href: '/portal' },
    ],
  },
];
