// Testimonials from real clients. Quotes are rewritten for length and
// rhythm but the meaning is preserved — never invent a sentiment that
// wasn't actually expressed.
//
// `quote` is the longer body (3–5 sentences). `pullQuote` is a tight
// one-line excerpt suitable for hero placement. `project` is an optional
// slug-style link back to the corresponding portfolio project, when
// applicable, so we can wire the testimonial into the Portfolio card.

export type Testimonial = {
  quote: string;
  pullQuote: string;
  authorName: string;
  authorRole: string;
  organization: string;
  organizationUrl?: string;
  // Slug used to associate the testimonial with a Portfolio entry.
  project?: 'safari-king' | 'usambara';
};

export const testimonials: ReadonlyArray<Testimonial> = [
  {
    pullQuote:
      'Since Ubunifu rebuilt our website, client trust has gone up and inquiries from people interested in visiting Tanzania have grown.',
    quote:
      "Since Ubunifu rebuilt our website, client trust has gone up and inquiries from people interested in visiting Tanzania have grown. The design is unique and professional — visitors regularly tell us it is what gave them the confidence to book. Throughout the work, the team listened carefully, communicated clearly, and made sure everything actually worked. They are one of the best teams we have worked with, and we would recommend them to anyone looking for serious website work.",
    authorName: 'Isaac',
    authorRole: 'Managing Director',
    organization: 'Usambara Destination Eco Tours',
    organizationUrl: 'https://www.usambaradestination.com/',
    project: 'usambara',
  },
];
