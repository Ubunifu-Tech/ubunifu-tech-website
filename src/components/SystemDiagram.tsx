import React from 'react';
import type { ProjectDiagramKind } from '@/content/project-visuals';
import { IsoBox, IsoPlane, IsoTray } from './iso';
import styles from './SystemDiagram.module.css';

export type SystemDiagramKind = ProjectDiagramKind | 'web' | 'hosting' | 'branding' | 'data' | 'ai' | 'strategy';

/**
 * Text-free system diagrams, with descriptions supplied outside the artwork.
 *
 * Drawn as flat isometric geometry in the same vocabulary as the home hero, rather
 * than as line icons floating in a pale box. The earlier version read as clip art:
 * thin outline glyphs at large size on a light ground, with no mass and no depth.
 * These share the hero's construction — solid forms, one lit face, routed orange
 * lines with right-angle turns — so a diagram on /work and the hero on / look like
 * they came from the same hand.
 *
 * scripts/check-project-visuals.mjs asserts the viewBox, the preserveAspectRatio,
 * the absence of any text node, and the accessible semantics. Keep all four.
 */

/** A stack of layered planes: several things that became one thing. */
function Stack({ cx, cy, w, step = 22, count = 3 }: { cx: number; cy: number; w: number; step?: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const k = count - 1 - i;
        const scale = 1 - k * 0.08;
        return (
          <IsoPlane
            key={k}
            className={i === count - 1 ? styles.lit : styles.layer}
            cx={cx}
            cy={cy - i * step}
            w={w * scale}
            h={(w * scale) / 2}
          />
        );
      })}
    </>
  );
}

function Composition({ kind }: { kind: SystemDiagramKind }) {
  switch (kind) {
    /* A trip enquiry arrives and fans out to two places at once: a structured
       notification for the operator, a confirmation for the visitor. */
    case 'enquiry':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M226 214 H300 V118 H416" />
            <path className={`${styles.route} ${styles.live}`} d="M226 214 H300 V302 H416" />
          </g>
          <Stack cx={150} cy={224} w={76} count={3} step={16} />
          <circle className={styles.node} cx={300} cy={214} r={8} />
          <IsoTray className={styles.solid} cx={486} cy={118} w={70} h={35} d={40} />
          <IsoBox className={styles.solid} cx={486} cy={302} w={70} h={35} d={30} />
          <circle className={styles.accentNode} cx={486} cy={302} r={10} />
        </>
      );

    /* Enquiries, customer records and drafting converge into one platform that
       the team runs from. */
    case 'operations':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M150 120 H236 V182 H288" />
            <path className={styles.route} d="M150 214 H288" />
            <path className={styles.route} d="M150 308 H236 V246 H288" />
            <path className={`${styles.route} ${styles.live}`} d="M392 214 H494 V150" />
          </g>
          <IsoPlane className={styles.layer} cx={110} cy={120} w={44} h={22} />
          <IsoPlane className={styles.layer} cx={110} cy={214} w={44} h={22} />
          <IsoPlane className={styles.layer} cx={110} cy={308} w={44} h={22} />
          <IsoPlane className={styles.plinth} cx={340} cy={272} w={112} h={56} />
          <Stack cx={340} cy={244} w={86} />
          <circle className={styles.accentNode} cx={494} cy={150} r={11} />
          <circle className={styles.ring} cx={494} cy={150} r={20} />
        </>
      );

    /* Layers of a site assembled over one foundation. */
    case 'web':
      return (
        <>
          <g className={styles.routes}>
            <path className={`${styles.route} ${styles.live}`} d="M320 96 V148" />
          </g>
          <IsoPlane className={styles.plinth} cx={320} cy={300} w={150} h={75} />
          <Stack cx={320} cy={268} w={116} count={4} step={26} />
          <circle className={styles.accentNode} cx={320} cy={88} r={10} />
        </>
      );

    /* One domain resolving to a server and a mail route. */
    case 'hosting':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M232 200 H300 V132 H408" />
            <path className={`${styles.route} ${styles.live}`} d="M232 200 H300 V272 H408" />
          </g>
          <circle className={styles.accentNode} cx={188} cy={200} r={12} />
          <circle className={styles.ring} cx={188} cy={200} r={22} />
          <IsoBox className={styles.solid} cx={472} cy={132} w={52} h={26} d={58} />
          <line className={styles.slot} x1={444} y1={148} x2={472} y2={162} />
          <line className={styles.slot} x1={444} y1={166} x2={472} y2={180} />
          <IsoBox className={styles.solid} cx={472} cy={272} w={52} h={26} d={24} />
        </>
      );

    /* Identity elements resolving into one consistent set of surfaces. */
    case 'branding':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M142 154 H246 V214 H300" />
            <path className={styles.route} d="M142 274 H246 V214 H300" />
            <path className={`${styles.route} ${styles.live}`} d="M378 214 H488" />
          </g>
          <IsoPlane className={styles.layer} cx={108} cy={154} w={44} h={22} />
          <IsoPlane className={styles.lit} cx={108} cy={274} w={44} h={22} />
          <IsoBox className={styles.solid} cx={340} cy={196} w={48} h={24} d={44} />
          <IsoPlane className={styles.layer} cx={532} cy={168} w={58} h={29} />
          <IsoPlane className={styles.lit} cx={532} cy={250} w={58} h={29} />
          <circle className={styles.accentNode} cx={488} cy={214} r={10} />
        </>
      );

    /* Scattered records resolving into one readable panel. */
    case 'data':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M148 148 H252 V214 H320" />
            <path className={styles.route} d="M148 214 H320" />
            <path className={styles.route} d="M148 280 H252 V214 H320" />
          </g>
          <IsoPlane className={styles.layer} cx={112} cy={148} w={38} h={19} />
          <IsoPlane className={styles.layer} cx={112} cy={214} w={38} h={19} />
          <IsoPlane className={styles.layer} cx={112} cy={280} w={38} h={19} />
          <IsoPlane className={styles.lit} cx={444} cy={214} w={104} h={52} />
          <line className={styles.bar} x1={400} y1={214} x2={452} y2={240} />
          <line className={`${styles.bar} ${styles.barAccent}`} x1={418} y1={196} x2={488} y2={231} />
          <line className={styles.bar} x1={436} y1={178} x2={472} y2={196} />
        </>
      );

    /* Source documents pass through one processing block; a person's mark of
       approval sits on the output, not on the machine. */
    case 'ai':
      return (
        <>
          <g className={styles.routes}>
            <path className={styles.route} d="M160 168 H244 V214 H288" />
            <path className={styles.route} d="M160 260 H244 V214 H288" />
            <path className={`${styles.route} ${styles.live}`} d="M392 214 H470" />
          </g>
          <IsoPlane className={styles.layer} cx={120} cy={168} w={44} h={22} />
          <IsoPlane className={styles.layer} cx={120} cy={260} w={44} h={22} />
          <IsoBox className={styles.solid} cx={340} cy={196} w={52} h={26} d={40} />
          <IsoPlane className={styles.lit} cx={520} cy={214} w={62} h={31} />
          <line className={`${styles.bar} ${styles.barAccent}`} x1={496} y1={210} x2={534} y2={229} />
          <line className={styles.bar} x1={508} y1={196} x2={530} y2={207} />
        </>
      );

    /* Several routes were possible; one was chosen. The alternatives stay on the
       sheet, faint and stopping short, because the point of an advisory
       engagement is the options that were ruled out. */
    case 'strategy':
      return (
        <>
          <IsoPlane className={styles.sheet} cx={320} cy={232} w={268} h={134} />

          <g className={styles.routes}>
            {/* Candidates: wandering, and each stops without arriving. */}
            <path className={styles.candidate} d="M132 232 H196 V296 H300 V262 H352" />
            <path className={styles.candidate} d="M132 232 H232 V320 H372" />
            <path className={styles.candidate} d="M132 232 H172 V172 H244 V128 H316" />
            {/* The chosen route: fewer turns, and it arrives. */}
            <path className={`${styles.route} ${styles.live}`} d="M132 232 H216 V190 H336 V152 H444" />
          </g>

          <circle className={styles.node} cx={132} cy={232} r={9} />
          <circle className={styles.waypoint} cx={216} cy={190} r={6} />
          <circle className={styles.waypoint} cx={336} cy={152} r={6} />

          <IsoBox className={styles.solid} cx={492} cy={140} w={54} h={27} d={30} />
          <IsoPlane className={styles.lit} cx={492} cy={126} w={54} h={27} />
        </>
      );
  }
}

export function SystemDiagram({ kind, description, className, project = false }: {
  kind: SystemDiagramKind;
  description?: string;
  className?: string;
  project?: boolean;
}) {
  return (
    <div
      className={`${styles.frame} ${className ?? ''}`}
      role={description ? 'img' : undefined}
      aria-label={description || undefined}
      aria-hidden={!description || undefined}
      data-system-diagram={kind}
      data-project-diagram={project ? kind : undefined}
    >
      <svg
        className={styles.canvas}
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <Composition kind={kind} />
      </svg>
    </div>
  );
}
