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
    alt: 'A person types on a laptop at a desk, with code on a second screen and a flow diagram sketched in a notebook.',
    focalPosition: '52% 50%',
    detailPosition: '55% 22%',
  },
  aboutSystemsWorkshop: {
    src: '/editorial/about-systems-workshop-v1.webp',
    alt: 'Three people at a table work on a system diagram drawn on a large sheet of paper, with a laptop beside them.',
    focalPosition: '50% 50%',
    detailPosition: '57% 57%',
    detailSide: 'left',
  },
  industriesTransformationWorkshop: {
    src: '/editorial/industries-transformation-workshop-v1.webp',
    alt: 'A man presents code and a flow diagram on a wall screen to three colleagues at a meeting table.',
    focalPosition: '50% 50%',
    detailPosition: '76% 0%',
  },
} as const satisfies Record<string, EditorialPhoto>;
