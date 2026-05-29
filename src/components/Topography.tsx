import React from 'react';

// Signature motif: concentric contour lines, like an elevation map. It nods
// to Tanzanian terrain (the Rift, Kilimanjaro, the Usambara range) without
// being literal — it reads as cartography and precision. Rendered as scaled
// copies of one organic path so the rings stay clean and consistent.
//
// Tint it by setting `color` on the element (stroke uses currentColor).

const CONTOUR =
  'M0,-54 C30,-53 57,-33 55,-4 C53,27 33,55 2,57 C-30,59 -57,31 -59,0 C-61,-33 -31,-56 0,-54 Z';

const RINGS = [0.16, 0.29, 0.42, 0.55, 0.68, 0.81, 0.94, 1.07, 1.2, 1.33, 1.46];

type Props = {
  className?: string;
  /** Drift each ring outward to suggest a hillside rather than a target. */
  drift?: boolean;
};

export const Topography: React.FC<Props> = ({ className, drift = true }) => (
  <svg
    className={className}
    viewBox="-170 -170 340 340"
    fill="none"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    style={{ width: '100%', height: '100%', display: 'block' }}
  >
    {RINGS.map((k, i) => (
      <path
        key={k}
        d={CONTOUR}
        stroke="currentColor"
        strokeWidth={1.1}
        vectorEffect="non-scaling-stroke"
        transform={
          drift ? `translate(${i * 3.4} ${i * -2.1}) scale(${k})` : `scale(${k})`
        }
      />
    ))}
  </svg>
);
