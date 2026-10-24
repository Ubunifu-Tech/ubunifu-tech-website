// Sectors we serve. Presented as focus areas / capability, NOT as a claim of
// existing clients in each (see POSITIONING.md). `summary` and `offerings` give the
// per-sector depth used on the /industries page.

export type Sector = {
  key: string;
  label: string;
  summary: string;
  offerings: string[];
};

export const sectors: ReadonlyArray<Sector> = [
  {
    key: 'tourism',
    label: 'Tourism & Hospitality',
    summary:
      'Booking and enquiry platforms, marketing sites, and the systems behind them for safari operators and tour businesses.',
    offerings: ['Booking & enquiry systems', 'Marketing sites', 'Itinerary tools', 'Customer records & follow-up'],
  },
  {
    key: 'sme',
    label: 'SMEs & Retail',
    summary:
      'Sales, stock and customer credit kept in one place. Our own product, Ubunifu Sifa, does this for shops, restaurants and distributors.',
    offerings: ['Websites & e-commerce', 'POS & inventory', 'Credit & customers', 'Sales analytics'],
  },
  {
    key: 'finance',
    label: 'Finance',
    summary:
      'Reporting, customer portals and analytics built on the data a lender or insurer already holds. Regulated work is scoped with the domain and compliance specialists it needs.',
    offerings: ['Data analytics', 'Customer portals', 'Reporting', 'Workflow design'],
  },
  {
    key: 'ngo',
    label: 'NGOs & Non-profits',
    summary:
      'Programme data moved out of spreadsheets into dashboards a funder can read, along with the data collection and reporting workflow.',
    offerings: ['Impact dashboards', 'Process automation', 'Data management', 'Websites'],
  },
  {
    key: 'health',
    label: 'Healthcare',
    summary:
      'Public websites, reporting dashboards and admin workflows for health organisations. Patient and clinical systems are scoped with specialist privacy and health partners.',
    offerings: ['Public websites', 'Reporting dashboards', 'Admin workflows', 'Data planning'],
  },
  {
    key: 'agriculture',
    label: 'Agriculture',
    summary:
      'Market platforms, farm records and supply-chain tracking, designed to work on an unreliable connection.',
    offerings: ['Market platforms', 'Farm management', 'Supply chain', 'Yield analytics'],
  },
  {
    key: 'education',
    label: 'Education',
    summary:
      'E-learning platforms, student management systems and websites for schools and training providers.',
    offerings: ['E-learning', 'Student management', 'Websites'],
  },
  {
    key: 'government',
    label: 'Government',
    summary:
      'Citizen portals, internal data systems and process automation for public bodies. Procurement and governance requirements are agreed before work begins.',
    offerings: ['Citizen portals', 'Data systems', 'Process automation', 'AI assistants'],
  },
];
