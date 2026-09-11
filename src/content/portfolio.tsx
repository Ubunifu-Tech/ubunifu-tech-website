// Client projects shown in the "Our work" section and on per-project case
// study pages (/work/[slug]).
//
// Everything here is grounded in the actual project codebases. No invented
// metrics, no imagined briefs. `artwork.src` identifies the retained asset;
// EditorialVisual replaces its in-page use with an icon-based workflow diagram.
// The live-site link remains the source of
// truth for the delivered experience. `capabilities` are short chips for the
// card; `highlights` are the detailed "what we built" breakdown for the case
// study page; `overview` is the factual intro. If we don't know something
// (e.g. a launch metric), we leave it out rather than guess.
//
// `pullQuote` must appear word for word in the `overview` above it.
// `entries[]` paths live on client-controlled sites — re-verify them with
// `npm run check:live-links` before they ship.

import { projectDiagrams } from './project-visuals';

export type ProjectArtwork = {
  src: string;
  alt: string;
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
  artwork: ProjectArtwork;
  // Short chips for the Portfolio card.
  capabilities: string[];
  // Detailed feature breakdown for the case study page.
  highlights: ProjectHighlight[];
  // Factual intro paragraphs for the case study page.
  overview: string[];
  tech: string[];
  // Heading for the case study's article section, in the project's own terms.
  sectionHeading: string;
  // Standfirst beneath it. Says how this system is shaped, not what it achieved.
  sectionStandfirst: string;
  // Pulled into the margin of the case study. MUST appear word for word in
  // `overview` above it, so the margin can never drift from the body.
  pullQuote: string;
  furtherReading?: ReadonlyArray<{ href: string; title: string }>;
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
    artwork: {
      src: '/editorial/safari-field-v3.webp',
      alt: projectDiagrams['/editorial/safari-field-v3.webp'].description,
    },
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
        title: 'Customer records',
        body: 'Customer records carry full timelines, internal notes and booking history. Contact inquiries have status tracking and assisted replies, helping the team keep each enquiry visible and move it forward deliberately.',
      },
      {
        title: 'Admin access and audit logs',
        body: 'Two-factor (OTP) admin authentication, administrative audit logging, soft deletes for recoverable data, and a whitelist-based admin model provide practical safeguards without open sign-up.',
      },
      {
        title: 'Content and search built in',
        body: 'A rich-text article editor, dynamic sitemap, Schema.org structured data, and maintained redirects give the team a practical publishing workflow while protecting established URLs.',
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
    sectionHeading: 'How the system works',
    sectionStandfirst:
      'Two sides of one system. A public site that structures a first enquiry, and an admin platform where that enquiry becomes a customer record, a proposed itinerary and a reply — a loop that returns to the traveller as a shareable link.',
    pullQuote:
      'We built a connected public website and operating platform rather than treating the project as a brochure site.',
    furtherReading: [
      {
        href: '/blog/safari-king-website-operating-system',
        title: 'Behind the Build: Safari King Africa’s Website and Operations Platform',
      },
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
    artwork: {
      src: '/editorial/usambara-landscape-v3.webp',
      alt: projectDiagrams['/editorial/usambara-landscape-v3.webp'].description,
    },
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
        title: 'Hosting and server features',
        body: 'The site runs on a Node.js and Express server with Helmet security headers, HTTP compression and per-IP rate limiting.',
      },
      {
        title: 'Trip enquiries',
        body: 'The contact form captures trip context (dates, party size and interests) and triggers a two-email flow: a structured notification to the operator and a confirmation to the visitor. Browser draft saving reduces the risk of losing a half-finished enquiry.',
      },
      {
        title: 'Search and sharing',
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
    sectionHeading: 'How the site works',
    sectionStandfirst:
      'One path, built so it stays usable with a mouse, a keyboard or a screen reader — and one enquiry that splits in two on the way out, a brief for the operator and a confirmation for the visitor.',
    pullQuote:
      'We built the website to help someone move from curiosity to a structured trip enquiry.',
  },
];

// Lookup helper for the case study route.
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
