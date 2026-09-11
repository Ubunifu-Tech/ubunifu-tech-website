import React from 'react';
import styles from './HeroSystem.module.css';

/**
 * The home hero illustration, drawn rather than generated.
 *
 * The subject is a modular system assembling itself from scattered inputs — which is
 * geometry, and geometry is the one thing raster generation is worst at and SVG is
 * best at. Drawing it buys exact control of the quiet zone the headline sits in,
 * crispness at any density, colours that come from the brand tokens, and ~6KB instead
 * of a 57KB webp with a fixed crop.
 *
 * Composition follows the same rule as the art direction: inputs dim and low-contrast
 * on the left, everything bright and structured on the right, routed lines carrying
 * one into the other.
 */

/** Half-width, half-height and depth of the isometric unit. */
const W = 58;
const H = 29;

type BoxProps = {
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  d: number;
  className?: string;
};

/** One isometric box: top face plus its two side faces, shaded by CSS. */
function IsoBox({ cx, cy, w = W, h = H, d, className = '' }: BoxProps) {
  return (
    <g className={className}>
      <polygon className={styles.faceSide} points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx - w},${cy + d}`} />
      <polygon className={styles.faceFront} points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx + w},${cy + d}`} />
      <polygon className={styles.faceTop} points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`} />
    </g>
  );
}

/** A flat plane — a document, a panel, a layer in a stack. */
function IsoPlane({ cx, cy, w = W, h = H, className = '' }: Omit<BoxProps, 'd'>) {
  return (
    <polygon
      className={`${styles.plane} ${className}`}
      points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`}
    />
  );
}

export function HeroSystem() {
  return (
    <svg
      className={styles.svg}
      /* viewBox aspect is matched to the hero's own (~1.85:1) so `slice` crops
         almost nothing and the composition lands where it was drawn. */
      viewBox="125 213 900 488"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* ── Routed lines: inputs on the left resolving into the assembly ──
          Drawn first so the structures sit on top of them. */}
      <g>
        <path className={styles.route} d="M300 404 H430 V370 H604" />
        <path className={styles.route} d="M316 472 H486 V416 H604" />
        <path className={styles.route} d="M336 540 H532 V462 H604" />
        {/* The one live run: into the assembly, then up to the node on its roof. */}
        <path className={`${styles.route} ${styles.routeAccent}`} d="M604 416 H884 V322" />
      </g>

      {/* ── Left: the unstructured inputs. Dim, small, no highlights. ── */}
      <g className={styles.inputs}>
        <IsoPlane cx={236} cy={396} w={44} h={22} />
        <IsoPlane cx={236} cy={384} w={44} h={22} />
        <IsoBox cx={258} cy={462} w={36} h={18} d={24} />
        <IsoPlane cx={282} cy={540} w={48} h={24} />
        <circle className={styles.inputNode} cx={300} cy={404} r={5} />
        <circle className={styles.inputNode} cx={316} cy={472} r={5} />
        <circle className={styles.inputNode} cx={336} cy={540} r={5} />
      </g>

      {/* ── Right: one coherent assembly on a plinth. ── */}
      <g>
        <IsoPlane className={styles.plinth} cx={830} cy={548} w={210} h={105} />

        {/* Stacked layers — many parts that became one thing */}
        <IsoPlane className={styles.layer} cx={830} cy={498} w={146} h={73} />
        <IsoPlane className={styles.layer} cx={830} cy={472} w={132} h={66} />
        <IsoPlane className={styles.layerLit} cx={830} cy={446} w={118} h={59} />

        {/* Server block, left face of the assembly */}
        <IsoBox cx={734} cy={370} w={48} h={24} d={58} />
        <line className={styles.slot} x1={706} y1={388} x2={734} y2={402} />
        <line className={styles.slot} x1={706} y1={405} x2={734} y2={419} />
        <line className={styles.slot} x1={706} y1={422} x2={734} y2={436} />

        {/* Readout panel, right face */}
        <IsoPlane className={styles.panel} cx={928} cy={392} w={66} h={33} />
        <line className={styles.bar} x1={900} y1={392} x2={938} y2={411} />
        <line className={`${styles.bar} ${styles.barAccent}`} x1={912} y1={379} x2={962} y2={404} />
        <line className={styles.bar} x1={924} y1={366} x2={952} y2={380} />

        {/* The node the live run arrives at, on the assembly's roof */}
        <circle className={styles.nodeRing} cx={884} cy={310} r={21} />
        <circle className={styles.node} cx={884} cy={310} r={11} />
      </g>
    </svg>
  );
}
