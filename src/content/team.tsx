// Team members shown on the About page. Bios are from the website content plan.
// `photo` is optional - when omitted, the Team component renders a branded
// initials avatar. Drop a file into public/images/ and set `photo` to swap in
// a real headshot, e.g. photo: '/images/richard.jpg'.

export type TeamMember = {
  name: string;
  role: string;
  initials: string;
  bio: string;
  skills: string[];
  photo?: string;
};

export const team: ReadonlyArray<TeamMember> = [
  {
    name: 'Richard Pallangyo',
    role: 'Data & AI Builder',
    initials: 'RP',
    bio: 'Works hands-on in data science and AI. Richard enjoys building and innovating, and his focus is helping businesses innovate.',
    skills: ['AI & Machine Learning', 'Data Engineering', 'Python / FastAPI', 'Product'],
  },
  {
    name: 'HappyGod Pallangyo',
    role: 'Creative Director',
    initials: 'HP',
    bio: 'Keeps the team close to the ground - making sure what Ubunifu builds matches real market needs and stays well customized for local businesses.',
    skills: ['Brand Identity', 'UI/UX Design', 'Visual Direction', 'Video'],
  },
];
