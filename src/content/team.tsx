// Team members shown on the About page. `photo` is optional — when omitted,
// the Team component renders a branded initials avatar. `links` are optional
// social / portfolio links rendered as small icons.

export type TeamLink = {
  type: 'github' | 'linkedin' | 'site';
  href: string;
};

export type TeamMember = {
  name: string;
  role: string;
  initials: string;
  bio: string;
  skills: string[];
  photo?: string;
  links?: TeamLink[];
};

export const team: ReadonlyArray<TeamMember> = [
  {
    name: 'Richard Pallangyo',
    role: 'Data & AI',
    initials: 'RP',
    bio: 'Richard builds the data and AI. He spent years as a senior data engineer — architecting cloud platforms and leading a 30-person Data & AI team for enterprise clients — and is finishing a Master’s in Data Science at the University of Washington. At Ubunifu he builds the RAG and agentic-AI systems, the data pipelines, and the product engineering behind everything we ship.',
    skills: ['AI & Agentic Systems', 'Data Engineering', 'Python / FastAPI', 'Cloud (Azure / AWS)', 'Next.js / React'],
    links: [
      { type: 'github', href: 'https://github.com/rapaugustino' },
      { type: 'linkedin', href: 'https://linkedin.com/in/rapaugustino' },
    ],
  },
  {
    name: 'HappyGod Pallangyo',
    role: 'IT & Systems',
    initials: 'HP',
    bio: 'HappyGod keeps everything running. He handles the infrastructure — system and network administration, hosting, cPanel, and domains — along with the technical support that keeps clients online. With a background in computer engineering and accountancy, he is the bridge between the technology and the business, helping clients adopt new tools without the headaches.',
    skills: ['System Administration', 'Networking', 'Hosting & cPanel', 'Technical Support', 'Reporting'],
  },
];
