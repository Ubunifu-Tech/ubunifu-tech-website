export type EditorialPhoto = {
  src: string;
  alt: string;
  focalPosition?: string;
  detailPosition: string;
  detailSide?: 'left' | 'right';
};

export const editorialPhotography = {
  servicesCodeReview: {
    src: '/editorial/services-code-review-v1.webp',
    alt: 'Hands work at a laptop and monitor displaying code beside a sketched system flow.',
    focalPosition: '52% 50%',
    detailPosition: '55% 22%',
  },
  aboutSystemsWorkshop: {
    src: '/editorial/about-systems-workshop-v1.webp',
    alt: 'Several participants arrange a wordless system map around a table beside a laptop.',
    focalPosition: '50% 50%',
    detailPosition: '57% 57%',
    detailSide: 'left',
  },
  industriesTransformationWorkshop: {
    src: '/editorial/industries-transformation-workshop-v1.webp',
    alt: 'Four professionals discuss code and a wordless system flow during a presentation.',
    focalPosition: '50% 50%',
    detailPosition: '76% 0%',
  },
} as const satisfies Record<string, EditorialPhoto>;
