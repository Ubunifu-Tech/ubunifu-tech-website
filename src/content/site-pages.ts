// Every public page a person can be sent to, in one list. The website
// assistant's PAGES section and the chat's link allow-list (src/lib/chat-links.ts)
// both read it, so the assistant can only link a page that exists, and a page
// added here becomes linkable in the chat at the same time.
//
// This file is imported by client code (the chat renderer), so it must stay
// plain data with no imports.

export type SitePage = {
  path: string;
  title: string;
  /** What someone finds there, in a line. */
  what: string;
};

export const sitePages: ReadonlyArray<SitePage> = [
  { path: '/', title: 'Home', what: 'What Ubunifu does, how we work, our services, products and recent work.' },
  { path: '/build', title: 'Services', what: 'Every service and what it includes, and the four stages of a project.' },
  { path: '/work', title: 'Our Work', what: 'Client projects, each with a case study.' },
  { path: '/products', title: 'Products', what: 'Our own software products, with links to open them.' },
  { path: '/industries', title: 'Industries', what: 'The sectors we work in and what we offer each.' },
  { path: '/about', title: 'About', what: 'Vision, mission, our story, how we work, our values and the team.' },
  {
    path: '/blog',
    title: 'Insights',
    what: 'Our journal of articles. Not the same thing as the Ubunifu Insight product.',
  },
  { path: '/careers', title: 'Careers', what: 'Open roles, and how to send a general introduction.' },
  { path: '/contact', title: 'Contact', what: 'The contact form, our email address and phone number.' },
  { path: '/privacy', title: 'Privacy', what: 'What this website, the contact form and the chat collect, and how it is used.' },
  { path: '/brand', title: 'Brand kit', what: 'Logo files, colours, typography and usage rules.' },
  { path: '/portal', title: 'Client portal', what: 'Where invited clients sign in to follow their projects.' },
];

/**
 * Paths with a page per record under them: /work/<case study>,
 * /blog/<article> and everything inside the client portal. A link may go
 * deeper than these prefixes; nothing else may.
 */
export const dynamicPrefixes: ReadonlyArray<string> = ['/work/', '/blog/', '/portal/'];
