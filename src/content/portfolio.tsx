// Client projects shown in the "Our work" section and on per-project case
// study pages (/work/[slug]).
//
// Everything here is grounded in the actual project codebases. No invented
// metrics, no imagined briefs. `capabilities` are short chips for the card;
// `highlights` are the detailed "what we built" breakdown for the case study
// page; `overview` is the factual intro. If we don't know something (e.g. a
// launch metric), we leave it out rather than guess.

export type ProjectScreenshot = {
  src: string;
  alt: string;
  // Optional caption shown beneath the image on the case study page.
  caption?: string;
};

export type ProjectHighlight = {
  title: string;
  body: string;
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  description: string;
  domain: string;
  link: string;
  // Primary screenshot for the card hero + case study hero.
  primary: ProjectScreenshot;
  // Supporting screenshots shown in the case study gallery.
  gallery?: ProjectScreenshot[];
  // Short chips for the Portfolio card.
  capabilities: string[];
  // Detailed feature breakdown for the case study page.
  highlights: ProjectHighlight[];
  // Factual intro paragraphs for the case study page.
  overview: string[];
  tech: string[];
};

export const projects: ReadonlyArray<Project> = [
  {
    slug: 'safari-king',
    title: 'Safari King Africa',
    category: 'Booking platform + operations system',
    description:
      'A public booking experience and custom operations platform for a private-guided safari operator, bringing enquiries, customer records, content, and assisted drafting into one system.',
    domain: 'safarikingafrica.com',
    link: 'https://www.safarikingafrica.com/',
    primary: {
      src: '/work/safari-king-admin.png',
      alt: 'Safari King admin dashboard with revenue pipeline, bookings trend chart, status mix and circuit demand breakdown',
      caption:
        'The admin dashboard: pipeline, bookings trend, status mix and circuit demand at a glance.',
    },
    gallery: [
      {
        src: '/work/safari-king-assistant.png',
        alt: 'Safari King in-app assistant with prompt starters for social posts and campaign research',
        caption:
          'The in-app assistant supports itinerary, article, email and campaign drafting.',
      },
      {
        src: '/work/safari-king-preferences.png',
        alt: 'Safari preferences form showing circuit selection and every Tanzanian national park grouped by region',
        caption:
          'The booking flow captures circuit, parks, accommodation tier and trip details before a single email is exchanged.',
      },
      {
        src: '/work/safari-king-hero.png',
        alt: 'Safari King Africa public homepage hero with wildlife photography and primary booking call-to-action',
        caption:
          'The public site connects destination discovery to a structured trip enquiry.',
      },
    ],
    capabilities: [
      'Public booking site',
      'Custom admin CRM',
      'Assisted content workflows',
      'Itinerary & content generation',
      '2FA + audit logging',
      'Newsletter & email automation',
    ],
    highlights: [
      {
        title: 'An assistant for recurring content work',
        body: 'The admin assistant supports day-by-day itinerary, article, metadata, booking-reply and newsletter drafts. The team stays in control of reviewing, editing and sending the final work.',
      },
      {
        title: 'Bookings, end to end',
        body: 'A multi-step inquiry flow captures trip basics, safari preferences and guest details. The team proposes an itinerary and shares it with the customer through a secure tokenised link, with no account required on the traveller’s side.',
      },
      {
        title: 'A real CRM behind the site',
        body: 'Customer records carry full timelines, internal notes and booking history. Contact inquiries have status tracking and assisted replies, helping the team keep each enquiry visible and move it forward deliberately.',
      },
      {
        title: 'Secure by default',
        body: 'Two-factor (OTP) admin authentication, administrative audit logging, soft deletes for recoverable data, and a whitelist-based admin model provide practical safeguards without open sign-up.',
      },
      {
        title: 'Content and search built in',
        body: 'A rich-text article editor, dynamic sitemap, Schema.org structured data, and maintained redirects give the team a practical publishing workflow while protecting established URLs.',
      },
      {
        title: 'A platform, not a brochure',
        body: 'The public destination catalogue, administrative workflows, API routes and connected data models are designed as one maintainable system rather than a collection of disconnected pages.',
      },
    ],
    overview: [
      'Safari King Africa is a private-guided safari operator in Tanzania. We built a connected public website and operating platform rather than treating the project as a brochure site.',
      'The public site organises parks, safari circuits, treks and coastal destinations. Behind it sits a custom admin platform for bookings, customer records, content management, email workflows and assisted drafting.',
    ],
    tech: [
      'Next.js 16',
      'React 19',
      'TypeScript',
      'PostgreSQL',
      'Prisma',
      'NextAuth',
      'Anthropic API',
      'Resend',
      'Vercel Blob',
      'Tailwind CSS',
      'Tiptap',
    ],
  },
  {
    slug: 'usambara-destination',
    title: 'Usambara Destination',
    category: 'Eco-tourism site + enquiry engine',
    description:
      'An accessible eco-tourism site for an operator in the Usambara Mountains, built on Node and Express with a working enquiry flow and search fundamentals.',
    domain: 'usambaradestination.com',
    link: 'https://www.usambaradestination.com/',
    primary: {
      src: '/work/usambara-hero.png',
      alt: 'Usambara Destination homepage hero "Karibu Tanzania" over a wildlife photograph with destination categories',
      caption:
        'The homepage leads with destinations and a clear route into trip planning.',
    },
    gallery: [
      {
        src: '/work/usambara-contact.png',
        alt: 'Usambara Destination contact page with a full-trip-context enquiry form and quick-connect cards',
        caption:
          'The enquiry form captures full trip context and triggers a two-email workflow: one to the operator, one back to the visitor.',
      },
    ],
    capabilities: [
      'Multi-page marketing site',
      'Enquiry form + email workflow',
      'Schema.org structured data',
      'Keyboard and screen-reader support',
      'Filterable photo gallery',
      'Node / Express backend',
    ],
    highlights: [
      {
        title: 'Not a static template',
        body: 'The site runs on a lightweight Node.js and Express server with Helmet security headers, HTTP compression and per-IP rate limiting. A real application, built for speed and resilience.',
      },
      {
        title: 'An enquiry form that does the operator’s prep',
        body: 'The contact form captures trip context (dates, party size and interests) and triggers a two-email flow: a structured notification to the operator and a confirmation to the visitor. Browser draft saving reduces the risk of losing a half-finished enquiry.',
      },
      {
        title: 'Search foundations as a feature',
        body: 'TravelAgency, FAQ, ContactPage, Blog and ImageGallery structured data; a sitemap and robots.txt; canonical URLs; OpenGraph and Twitter cards; and lazy-loaded imagery throughout.',
      },
      {
        title: 'Accessibility built into the interface',
        body: 'Skip links, semantic HTML, labelled controls, keyboard navigation and reduced-motion support make the core journey more usable across different input methods and preferences.',
      },
      {
        title: 'Built to browse',
        body: 'Destination guides, articles and a filterable gallery give visitors several ways to understand the offer before starting an enquiry.',
      },
    ],
    overview: [
      'Usambara Destination Eco Tours runs wildlife safaris, mountain treks, cultural tours and community programmes from the Usambara Mountains in northern Tanzania.',
      'We built the website to help someone move from curiosity to a structured trip enquiry. That meant responsive pages, search foundations, accessible interaction patterns, and a form that gives the team useful context for a personal reply.',
    ],
    tech: [
      'Node.js',
      'Express',
      'Resend',
      'Schema.org JSON-LD',
      'Vanilla JS',
      'HTML5 / CSS3',
    ],
  },
];

// Lookup helper for the case study route.
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
