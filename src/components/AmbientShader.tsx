'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './AmbientShader.module.css';

/**
 * The WebGL library is fetched only when the gates below actually pass. This file
 * is imported by every page header (via HeroBackdrop) but only the home hero ever
 * mounts the shader, so a static import would put the whole package in all eleven
 * route bundles. Measured at ~77KB gzipped — the package does not tree-shake well
 * at 0.0.80 — which is precisely why the gates run before the import fires.
 */
const MeshGradient = dynamic(
  () => import('@paper-design/shaders-react').then((m) => m.MeshGradient),
  { ssr: false }
);

/**
 * Ambient light field for dark surfaces, reacting to the pointer.
 *
 * It composites with `screen`, so it can only ever add light, and a CSS mask keeps it
 * away from whatever the surface actually needs to read. `placement` picks the mask:
 *   left   home hero — light in the copy column, clear of the illustration
 *   edges  page headers — light at the outer edges, quiet behind centred copy
 *   panel  CTA band — light entering from one side of a flat dark panel
 *
 * Gating, which the package does not provide and which is the part that matters for
 * a mid-range Android audience on metered data:
 *   - never mounts under prefers-reduced-motion, on <= 4 cores, or <= 4GB memory
 *   - unmounts entirely once the hero scrolls out of view, and while the tab is hidden
 *   - resolution capped via maxPixelCount instead of rendering at full DPR
 *   - pointer response only where a real pointer exists, so touch devices do no work
 *
 * In every skip case the page is complete without it: the static illustration and
 * the scrim already carry the hero.
 */

/** Any `true` here means we render nothing at all. */
function shouldSkip() {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true;

  return false;
}

/**
 * Deep navy base with the brand orange as the only true light, warmed through clay
 * and cooled through a deep indigo. Clay is what gives the field depth without
 * reaching for a violet, which on a navy ground reads as the generic purple-tech
 * wash rather than as this brand.
 */
const COLORS = ['#14102A', '#FF6B2C', '#C2693B', '#2A1F5C', '#1F1A36'];

/** How far the field slides toward the pointer, in shader offset units. */
const REACH = 0.5;

type Placement = 'left' | 'edges' | 'panel';

export function AmbientShader({ placement = 'left' }: { placement?: Placement }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Starts false so the server render and the first client paint agree — no canvas,
  // no hydration mismatch. It only turns on once the gates pass.
  const [active, setActive] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  // Target and current live in refs so the pointer handler never triggers a render;
  // only the eased value committed on each frame does.
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldSkip()) return;

    const host = hostRef.current;
    if (!host) return;

    let onscreen = true;
    let foreground = document.visibilityState === 'visible';
    const sync = () => setActive(onscreen && foreground);

    const io = new IntersectionObserver(
      (entries) => {
        onscreen = entries[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0 }
    );
    io.observe(host);

    const onVisibility = () => {
      foreground = document.visibilityState === 'visible';
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const host = hostRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    // -1..1 from the centre of the hero.
    target.current = {
      x: ((event.clientX - r.left) / r.width) * 2 - 1,
      y: ((event.clientY - r.top) / r.height) * 2 - 1,
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    // A coarse pointer has no hover position to follow, so touch devices skip the
    // listener and the easing loop entirely and just get the ambient drift.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let raf = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;

      // Critically-damped-ish easing: the field trails the cursor rather than
      // tracking it, which is what makes it read as light rather than a widget.
      current.current = {
        x: current.current.x + (target.current.x - current.current.x) * 0.07,
        y: current.current.y + (target.current.y - current.current.y) * 0.07,
      };

      const nx = Math.round(current.current.x * 1000) / 1000;
      const ny = Math.round(current.current.y * 1000) / 1000;
      setPointer((prev) => (prev.x === nx && prev.y === ny ? prev : { x: nx, y: ny }));
    };
    raf = requestAnimationFrame(tick);

    const onLeave = () => {
      target.current = { x: 0, y: 0 };
    };
    document.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [active, onPointerMove]);

  return (
    <div
      ref={hostRef}
      className={`${styles.host} ${styles[placement]}`}
      aria-hidden="true"
    >
      {active && (
        <MeshGradient
          className={styles.shader}
          colors={COLORS}
          /* The field slides toward the cursor and the vortex tightens slightly
             as it moves away from centre — two small responses rather than one
             obvious one, so it reads as the light noticing you. */
          offsetX={pointer.x * REACH}
          offsetY={pointer.y * REACH * 0.6}
          swirl={0.3 + Math.min(Math.hypot(pointer.x, pointer.y), 1) * 0.18}
          distortion={0.85}
          speed={0.1}
          /* Matches the film grain specified in IMAGE_PROMPTS.md, so the shader
             and the illustrations share a surface. */
          grainOverlay={0.04}
          /* 0.36MP is well under a 1440x780 hero at 1x. The field is entirely
             low-frequency, so rendering small costs nothing visually. */
          maxPixelCount={360000}
          minPixelRatio={1}
        />
      )}
    </div>
  );
}
