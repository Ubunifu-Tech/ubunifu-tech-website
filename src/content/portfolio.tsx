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
    category: 'Booking platform and operations system',
    description:
      'A public booking site and a custom operations platform for a private-guided safari operator. Enquiries, customer records, content and assisted drafting are handled in one system.',
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
      '2FA and audit logging',
      'Newsletter & email automation',
    ],
    highlights: [
      {
        title: 'An assistant for content drafts',
        body: 'An assistant in the admin drafts day-by-day itineraries, articles, metadata, booking replies and newsletters. The team reviews, edits and sends the final version.',
      },
      {
        title: 'Booking enquiries and itineraries',
        body: 'A multi-step enquiry form collects trip basics, safari preferences and guest details. The team proposes an itinerary and sends it to the customer as a secure, tokenised link. The traveller does not need an account.',
      },
      {
        title: 'Customer records',
        body: 'Each customer record has a full timeline, internal notes and booking history. Contact enquiries have a status and assisted replies, so the team can see where each one stands.',
      },
      {
        title: 'Admin access and audit logs',
        body: 'Admins sign in with two-factor authentication (OTP), and their actions are logged. Deleted records can be recovered. Only people on an approved list can be admins, so there is no open sign-up.',
      },
      {
        title: 'Content and search',
        body: 'The team publishes with a rich-text article editor. The site has a dynamic sitemap and Schema.org structured data, and redirects keep established URLs working.',
      },
    ],
    overview: [
      'Safari King Africa is a private-guided safari operator in Tanzania. We built the public website and the operations platform behind it as one connected system.',
      'The public site covers parks, safari circuits, treks and coastal destinations. The custom admin platform handles bookings, customer records, content management, email workflows and assisted drafting.',
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
      'The public site collects a first enquiry. In the admin platform, that enquiry becomes a customer record, a proposed itinerary and a reply, which goes back to the traveller as a shareable link.',
    pullQuote:
      'We built the public website and the operations platform behind it as one connected system.',
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
    category: 'Eco-tourism website and enquiry flow',
    description:
      'An accessible eco-tourism website for an operator in the Usambara Mountains. It runs on Node and Express and includes an enquiry flow and basic search engine optimisation.',
    domain: 'usambaradestination.com',
    link: 'https://www.usambaradestination.com/',
    artwork: {
      src: '/editorial/usambara-landscape-v3.webp',
      alt: projectDiagrams['/editorial/usambara-landscape-v3.webp'].description,
    },
    capabilities: [
      'Multi-page marketing site',
      'Enquiry form and email workflow',
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
        body: 'The contact form asks for dates, party size and interests. Each enquiry sends two emails: a structured notification to the operator and a confirmation to the visitor. The browser saves a draft, so a half-finished enquiry is less likely to be lost.',
      },
      {
        title: 'Search and sharing',
        body: 'The site has TravelAgency, FAQ, ContactPage, Blog and ImageGallery structured data, a sitemap and robots.txt, canonical URLs, and OpenGraph and Twitter cards. Images load lazily throughout.',
      },
      {
        title: 'Accessibility',
        body: 'The main pages have skip links, semantic HTML, labelled controls, keyboard navigation and reduced-motion support. These make them easier to use with a keyboard or screen reader, and for visitors who prefer less motion.',
      },
      {
        title: 'Guides, articles and gallery',
        body: 'Destination guides, articles and a filterable gallery let visitors learn about the tours before they send an enquiry.',
      },
    ],
    overview: [
      'Usambara Destination Eco Tours runs wildlife safaris, mountain treks, cultural tours and community programmes from the Usambara Mountains in northern Tanzania.',
      'We built the website so a visitor can read about the tours and then send a detailed trip enquiry. It has responsive pages, basic search engine optimisation, accessible controls, and a form that gives the team what it needs for a personal reply.',
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
      'How visitors find their way around the site, and what happens when they send an enquiry.',
    pullQuote:
      'We built the website so a visitor can read about the tours and then send a detailed trip enquiry.',
  },
];

// Lookup helper for the case study route.
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
