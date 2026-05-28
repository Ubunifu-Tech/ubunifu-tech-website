// Client projects shown in the "Our work" section.
//
// Each project has a primary screenshot used as the card hero, plus optional
// additional screenshots for a future gallery view. The `capabilities` array
// describes what we actually built — only include things that are demonstrably
// true (i.e. visible in the screenshots or shipped in the live product).

export type ProjectScreenshot = {
  src: string;
  alt: string;
};

export type Project = {
  title: string;
  category: string;
  description: string;
  domain: string;
  link: string;
  // Primary screenshot for the card hero.
  primary: ProjectScreenshot;
  // Optional supporting screenshots — surfaced in future detail views.
  gallery?: ProjectScreenshot[];
  // What we actually built. Each entry should be backed by either a
  // screenshot or a shipping feature on the live site.
  capabilities: string[];
  tech: string[];
};

export const projects: ReadonlyArray<Project> = [
  {
    title: 'Safari King Africa',
    category: 'Booking platform + custom CRM + AI copilot',
    description:
      "End-to-end booking platform for one of Tanzania's private-guided safari operators. We built the public site, a custom admin CRM with bookings / inquiries / customer pipelines, and an in-app marketing copilot powered by Claude Sonnet 4.6.",
    domain: 'safarikingafrica.com',
    link: 'https://www.safarikingafrica.com/',
    primary: {
      src: '/work/safari-king-admin.png',
      alt: 'Safari King admin dashboard with revenue pipeline, bookings trend chart, status mix and circuit demand breakdown',
    },
    gallery: [
      {
        src: '/work/safari-king-assistant.png',
        alt: 'Safari King in-app AI marketing assistant powered by Claude Sonnet 4.6, with prompt starters for social posts and campaign research',
      },
      {
        src: '/work/safari-king-preferences.png',
        alt: 'Safari preferences form showing circuit selection and every Tanzanian national park grouped by region',
      },
      {
        src: '/work/safari-king-hero.png',
        alt: 'Safari King Africa public homepage hero with wildlife photography and primary booking call-to-action',
      },
    ],
    capabilities: [
      'Public booking site',
      'Custom admin CRM',
      'AI marketing copilot (Claude Sonnet 4.6)',
      'Inquiries + customer pipeline',
      'Package & destination catalog',
    ],
    tech: ['Next.js', 'PostgreSQL', 'Prisma', 'NextAuth', 'Claude API', 'Resend'],
  },
  {
    title: 'Usambara Destination',
    category: 'Eco-tourism marketing site',
    description:
      'Multi-page marketing and enquiry site for an eco-tourism operator based in the Usambara Mountains, covering wildlife safaris, mountain climbing, cultural tourism and community programmes.',
    domain: 'usambaradestination.com',
    link: 'https://www.usambaradestination.com/',
    primary: {
      src: '/work/usambara-hero.png',
      alt: 'Usambara Destination homepage hero "Karibu Tanzania" over a wildlife photograph with destination categories',
    },
    capabilities: [
      'Multi-page marketing site',
      'Tour package pages',
      'Enquiry form with full trip context',
      'Mobile-first layout',
    ],
    tech: ['HTML', 'CSS', 'Schema.org', 'SEO'],
  },
];
