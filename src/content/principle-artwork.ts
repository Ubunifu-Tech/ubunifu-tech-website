import type { PillarKey } from './pillars';

type PrincipleArtwork = {
  src: string;
  alt: string;
};

/** Visual explanations of the four factual operating principles on the homepage. */
export const principleArtwork: Record<PillarKey, PrincipleArtwork> = {
  local: {
    src: '/editorial/principle-local-v1.webp',
    alt: 'Three colleagues trace a local workflow together around a table.',
  },
  shipped: {
    src: '/editorial/principle-shipped-v1.webp',
    alt: 'A team moves a finished website interface through a delivery line to an approved release.',
  },
  ai: {
    src: '/editorial/principle-ai-v1.webp',
    alt: 'A professional reviews a machine-assisted document before approving it.',
  },
  accountable: {
    src: '/editorial/principle-accountable-v1.webp',
    alt: 'Two people monitor and maintain a live software system after launch.',
  },
};
