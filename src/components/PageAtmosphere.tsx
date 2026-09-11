import React from 'react';
import { AmbientShader } from './AmbientShader';

/**
 * A slow violet haze across a whole page, following the cursor.
 *
 * The brief was that it should be noticeable while you browse but never
 * distracting, so the field is deliberately weak and slow: it should register as
 * the page being alive, not as something happening on it.
 *
 * The palette is mostly white on purpose. Under multiply, white is a no-op, so
 * only the violet stops actually tint anything — the result reads as a few soft
 * clouds drifting over the light sections rather than a flat lavender wash, and
 * the dark header and CTA band are left very nearly untouched.
 *
 * Everything expensive is already gated in AmbientShader: it never mounts under
 * prefers-reduced-motion, on four cores or fewer, or on 4GB or less; it drops
 * the WebGL context while the tab is in the background; it caps its own
 * resolution; and it only tracks a real pointer, so phones do no work for it.
 */

/** White does nothing under multiply; the violets are the only ink here. */
const HAZE = ['#FFFFFF', '#F0EAFD', '#C4AEF3', '#FFFFFF', '#DACEF9'] as const;

export function PageAtmosphere() {
  return (
    <AmbientShader
      placement="page"
      character={{
        colors: HAZE,
        distortion: 0.72,
        swirl: 0.2,
        /* Slower than any other placement on the site. At hero speeds a
           full-viewport field reads as motion in the corner of your eye while
           you are trying to read. */
        speed: 0.05,
      }}
    />
  );
}
