import type { PillarKey } from './pillars';

type PrincipleArtwork = {
  src: string;
  alt: string;
};

/** Visual explanations of the four factual operating principles on the homepage. */
export const principleArtwork: Record<PillarKey, PrincipleArtwork> = {
  local: {
    src: '/editorial/principle-local-v1.webp',
    alt: 'Illustration of three colleagues at a table, mapping out a workflow on paper.',
  },
  shipped: {
    src: '/editorial/principle-shipped-v1.webp',
    alt: 'Illustration of a team moving a website design along a conveyor belt to a server marked with a tick.',
  },
  ai: {
    src: '/editorial/principle-ai-v1.webp',
    alt: 'Illustration of a woman checking a machine-drafted document before she approves it.',
  },
  accountable: {
    src: '/editorial/principle-accountable-v1.webp',
    alt: 'Illustration of two people looking after a server: one checks a tablet while the other replaces a part.',
  },
};
