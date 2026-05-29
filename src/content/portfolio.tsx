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
    category: 'Booking platform + custom CRM + AI assistant',
    description:
      "The full digital operation for a private-guided safari operator: a public booking site covering every Tanzanian park, circuit, trek and beach, and a custom admin platform with an AI assistant the team uses every day.",
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
        alt: 'Safari King in-app AI assistant powered by Claude Sonnet 4.6, with prompt starters for social posts and campaign research',
        caption:
          'The in-app assistant runs on Claude Sonnet 4.6 and drafts itineraries, blog posts, emails and campaigns.',
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
          'The public site spans every Tanzanian park, circuit, trek and beach destination.',
      },
    ],
    capabilities: [
      'Public booking site',
      'Custom admin CRM',
      'AI assistant (Claude Sonnet 4.6)',
      'Itinerary & content generation',
      '2FA + audit logging',
      'Newsletter & email automation',
    ],
    highlights: [
      {
        title: 'An AI assistant that does six jobs',
        body: 'Built on Claude Sonnet 4.6, the admin assistant drafts day-by-day itineraries, blog posts, SEO metadata, personalised booking replies, inquiry responses and newsletters. A streaming multi-turn chat handles open-ended drafting and research, with prompt caching to keep running costs low.',
      },
      {
        title: 'Bookings, end to end',
        body: 'A multi-step inquiry flow captures trip basics, safari preferences and guest details. The team proposes an itinerary and shares it with the customer through a secure tokenised link, with no account required on the traveller’s side.',
      },
      {
        title: 'A real CRM behind the site',
        body: 'Customer records carry full timelines, internal notes and booking history. Contact inquiries have status tracking and AI-assisted replies, so no enquiry slips through the cracks.',
      },
      {
        title: 'Secure by default',
        body: 'Two-factor (OTP) admin authentication, a complete audit log of every admin action, soft deletes for recoverable data, and a whitelist-based admin model rather than open sign-up.',
      },
      {
        title: 'Content and search built in',
        body: 'A Tiptap rich-text blog editor, a dynamic sitemap, Schema.org structured data, and 40+ maintained redirects so search rankings survived the migration from the old site.',
      },
      {
        title: 'Built to scale',
        body: 'Roughly 95 pages across destinations, experiences, trekking and beaches, 48 API routes, and 13 data models. A genuine platform, not a brochure.',
      },
    ],
    overview: [
      'Safari King Africa is a private-guided safari operator in Tanzania. We built their entire digital operation: not just a website, but the system that runs the business behind it.',
      'The public site covers every Tanzanian national park, all four safari circuits, the major treks and the coastal destinations. Behind it sits a custom admin platform: bookings, a customer CRM, content management, email automation, and an AI assistant the team reaches for every day.',
    ],
    tech: [
      'Next.js 16',
      'React 19',
      'TypeScript',
      'PostgreSQL',
      'Prisma',
      'NextAuth',
      'Claude (Sonnet 4.6)',
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
      'A fast, accessible eco-tourism site for an operator in the Usambara Mountains, built on Node and Express with a real enquiry workflow, strong search visibility, and WCAG AA accessibility.',
    domain: 'usambaradestination.com',
    link: 'https://www.usambaradestination.com/',
    primary: {
      src: '/work/usambara-hero.png',
      alt: 'Usambara Destination homepage hero "Karibu Tanzania" over a wildlife photograph with destination categories',
      caption:
        'The homepage leads with the destinations and a 5.0-star TripAdvisor rating.',
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
      'WCAG AA accessibility',
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
        body: 'The contact form captures full trip context (dates, party size, interests) and triggers a two-email flow: a structured notification to the operator and a confirmation with next steps to the visitor. Drafts auto-save to the browser so a half-finished enquiry is never lost.',
      },
      {
        title: 'Search visibility as a feature',
        body: 'TravelAgency, FAQ, ContactPage, Blog and ImageGallery structured data; a sitemap and robots.txt; canonical URLs; OpenGraph and Twitter cards; and lazy-loaded imagery throughout.',
      },
      {
        title: 'Accessible to everyone',
        body: 'WCAG AA: skip-to-content links, semantic HTML, ARIA roles, full keyboard navigation on the custom date and select controls, and reduced-motion support for visitors who need it.',
      },
      {
        title: 'Built to browse',
        body: '22+ pages including nine destination guides and a blog, plus a filterable lightbox gallery. Fast on a mid-range phone and a slow connection.',
      },
    ],
    overview: [
      'Usambara Destination Eco Tours runs wildlife safaris, mountain treks, cultural tours and community programmes from the Usambara Mountains in northern Tanzania.',
      'We built their website to do one thing exceptionally well: turn a stranger’s curiosity into a booked enquiry. That meant fast pages, strong search visibility, genuine accessibility, and an enquiry flow that hands the team everything they need to write a personal reply.',
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
