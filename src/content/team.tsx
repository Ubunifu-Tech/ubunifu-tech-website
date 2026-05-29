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
    role: 'Data, Software & AI Engineer',
    initials: 'RP',
    bio: 'Richard is a data, software, and AI engineer. He builds the systems behind everything we ship — data pipelines, backend services, and the RAG and agentic-AI that make our products work. He is at home across Python, the modern cloud data stack, and the web, turning hard data and AI problems into software that runs in production.',
    skills: ['Data Engineering', 'AI & Agentic Systems', 'Software Engineering', 'Python / FastAPI', 'Cloud (Azure / AWS)'],
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
