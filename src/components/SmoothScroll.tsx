'use client';

import { useReducedMotion } from 'framer-motion';
import { ReactLenis } from 'lenis/react';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
