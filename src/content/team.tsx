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
    role: 'Data · Software · AI',
    initials: 'RP',
    bio: 'Richard is a data, software and AI engineer. He builds data pipelines, backend services and AI features such as retrieval (RAG) and agents. He works with Python, cloud data tools and web technologies.',
    skills: ['Data Engineering', 'AI & Agentic Systems', 'Software Engineering', 'Python / FastAPI', 'Cloud (Azure / AWS)'],
    links: [
      { type: 'github', href: 'https://github.com/rapaugustino' },
      { type: 'linkedin', href: 'https://linkedin.com/in/rapaugustino' },
    ],
  },
  {
    name: 'HappyGod Pallangyo',
    role: 'IT · Design · Support',
    initials: 'HP',
    bio: 'HappyGod looks after system and network administration, hosting, cPanel, domains and client support, and helps clients get started with new tools. He also leads our design work, including brand identity. His background is in computer engineering and accountancy.',
    skills: ['System Administration', 'Networking', 'Hosting & cPanel', 'Brand & Design', 'Technical Support'],
  },
];
