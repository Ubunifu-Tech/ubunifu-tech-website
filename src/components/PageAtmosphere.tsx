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
 * only the violet stops actually tint anything. The result reads as a few soft
 * clouds drifting over the light sections rather than a flat lavender wash.
 *
 * Everything expensive is already gated in AmbientShader: it never mounts under
 * prefers-reduced-motion, on four cores or fewer, or on 4GB or less; it drops
 * the WebGL context while the tab is in the background; it caps its own
 * resolution; and it only tracks a real pointer, so phones do no work for it.
 */

/**
 * Mostly white, and the violets are deliberately pale.
 *
 * The deepest stop here sets the darkest ground any text on the site can end up
 * sitting on, so it is a contrast budget, not a colour choice. It was briefly
 * paler than this: at the original #C4AEF3 / 0.5, --brand-deep measured 3.80:1
 * and --text-tertiary 3.83:1, both under the 4.5:1 floor.
 *
 * The fix was to give those two tokens headroom rather than to keep bleaching
 * the field — --brand-deep is now #A63A11 and --text-tertiary 68% ink — which
 * buys back most of the density. At 0.36 opacity the worst token measures
 * 4.63:1, so this palette and that opacity are a matched pair: raising either
 * one without re-measuring will quietly push accent text under AA.
 */
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
