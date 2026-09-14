import { IsoBox, IsoPlane, IsoTray } from './iso';
import styles from './StoryVisual.module.css';

export type StoryVisualKind =
  | 'journey'
  | 'learning'
  | 'ledger'
  | 'decision'
  | 'workshop'
  | 'pricing';

const storyVisuals: Record<string, { kind: StoryVisualKind; description: string }> = {
  '/editorial/tourism-systems.webp': {
    kind: 'journey',
    description: 'A connected journey moving through planning stages into one working tourism system.',
  },
  '/editorial/swahili-learning.webp': {
    kind: 'learning',
    description: 'A learning exchange connecting a question, a lesson, and a reviewed answer.',
  },
  '/editorial/credit-ledger.webp': {
    kind: 'ledger',
    description: 'A sale and partial payments remaining connected to one visible credit ledger.',
  },
  '/editorial/build-or-buy.webp': {
    kind: 'decision',
    description: 'One requirement branching toward a standard platform or a custom-built system.',
  },
  '/editorial/software-tanzania-learning.webp': {
    kind: 'workshop',
    description: 'Working notes and repeated revisions resolving into one assembled software product.',
  },
  '/editorial/usage-based-pricing.webp': {
    kind: 'pricing',
    description: 'Measured units of work connecting directly to an itemised usage record.',
  },
};

export function getStoryVisual(src: unknown) {
  if (typeof src !== 'string') return undefined;
  return storyVisuals[src];
}

function PaperStack({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <IsoPlane className={styles.paperSoft} cx={cx} cy={cy} w={76} h={38} />
      <IsoPlane className={styles.paperMid} cx={cx} cy={cy - 18} w={70} h={35} />
      <IsoPlane className={styles.paperLit} cx={cx} cy={cy - 36} w={64} h={32} />
    </>
  );
}

function JourneyVisual() {
  return (
    <>
      <path className={styles.route} d="M78 286 H190 V226 H302 V286 H430 V206 H638" />
      <path className={styles.liveRoute} d="M78 286 H190 V226 H302" />
      {[78, 190, 302, 430, 638].map((x, index) => (
        <circle key={x} className={index === 2 ? styles.signal : styles.node} cx={x} cy={index === 1 ? 226 : index === 3 ? 206 : 286} r="8" />
      ))}
      <PaperStack cx={520} cy={254} />
      <IsoBox className={styles.violetBox} cx={182} cy={142} w={48} h={24} d={46} />
      <path className={styles.detailLine} d="M470 155 H584 M486 176 H566" />
    </>
  );
}

function LearningVisual() {
  return (
    <>
      <path className={styles.route} d="M152 202 H276 V132 H432 V202 H560" />
      <path className={styles.liveRoute} d="M152 202 H276 V274 H432 V202 H560" />
      <rect className={styles.panel} x="72" y="145" width="96" height="114" rx="6" />
      <path className={styles.detailLine} d="M96 178 H142 M96 200 H132 M96 222 H146" />
      <IsoBox className={styles.violetBox} cx={354} cy={182} w={54} h={27} d={54} />
      <rect className={styles.panel} x="548" y="145" width="100" height="114" rx="6" />
      <path className={styles.detailLine} d="M572 178 H622 M572 200 H612 M572 222 H628" />
      <circle className={styles.signal} cx="432" cy="202" r="9" />
    </>
  );
}

function LedgerVisual() {
  const rows = [144, 184, 224, 264];
  return (
    <>
      <rect className={styles.ledger} x="250" y="94" width="220" height="220" rx="8" />
      {rows.map((y, index) => (
        <g key={y}>
          <path className={styles.detailLine} d={`M278 ${y} H374 M402 ${y} H442`} />
          <circle className={index === 2 ? styles.signal : styles.node} cx="228" cy={y} r="7" />
          <path className={index === 2 ? styles.liveRoute : styles.route} d={`M96 ${y} H228`} />
        </g>
      ))}
      <IsoTray className={styles.orangeBox} cx={116} cy={308} w={58} h={29} d={38} />
      <path className={styles.route} d="M174 308 H212 V264" />
    </>
  );
}

function DecisionVisual() {
  return (
    <>
      <IsoPlane className={styles.paperLit} cx={114} cy={204} w={60} h={30} />
      <path className={styles.route} d="M174 204 H278 V126 H388" />
      <path className={styles.liveRoute} d="M174 204 H278 V284 H388" />
      <circle className={styles.signal} cx="278" cy="204" r="9" />
      <g className={styles.standardBlocks}>
        <rect x="398" y="82" width="72" height="72" rx="5" />
        <rect x="484" y="82" width="72" height="72" rx="5" />
        <rect x="570" y="82" width="72" height="72" rx="5" />
      </g>
      <IsoBox className={styles.violetBox} cx={494} cy={270} w={68} h={34} d={58} />
      <path className={styles.detailLine} d="M446 270 L494 294 L542 270" />
    </>
  );
}

function WorkshopVisual() {
  return (
    <>
      <IsoPlane className={styles.paperSoft} cx={116} cy={128} w={54} h={27} />
      <IsoPlane className={styles.paperMid} cx={148} cy={220} w={54} h={27} />
      <IsoPlane className={styles.paperSoft} cx={108} cy={312} w={54} h={27} />
      <path className={styles.route} d="M170 128 H262 V190 H334" />
      <path className={styles.route} d="M202 220 H334" />
      <path className={styles.liveRoute} d="M162 312 H262 V250 H334" />
      <IsoPlane className={styles.paperSoft} cx={454} cy={292} w={106} h={53} />
      <IsoBox className={styles.violetBox} cx={454} cy={192} w={60} h={30} d={70} />
      <circle className={styles.signal} cx="262" cy="250" r="9" />
    </>
  );
}

function PricingVisual() {
  const segments = [0, 1, 2, 3, 4, 5];
  return (
    <>
      <rect className={styles.panel} x="82" y="120" width="250" height="168" rx="8" />
      <path className={styles.detailLine} d="M112 160 H188 M112 190 H212" />
      <g className={styles.meter}>
        {segments.map((segment) => (
          <rect key={segment} x={112 + segment * 31} y="228" width="21" height={segment < 4 ? 28 : 14} rx="2" />
        ))}
      </g>
      <path className={styles.liveRoute} d="M332 204 H418" />
      <circle className={styles.signal} cx="418" cy="204" r="9" />
      <rect className={styles.receipt} x="456" y="88" width="170" height="236" rx="6" />
      <path className={styles.detailLine} d="M486 132 H588 M486 170 H570 M486 208 H600 M486 266 H552" />
    </>
  );
}

function Composition({ kind }: { kind: StoryVisualKind }) {
  switch (kind) {
    case 'journey':
      return <JourneyVisual />;
    case 'learning':
      return <LearningVisual />;
    case 'ledger':
      return <LedgerVisual />;
    case 'decision':
      return <DecisionVisual />;
    case 'workshop':
      return <WorkshopVisual />;
    case 'pricing':
      return <PricingVisual />;
  }
}

export function StoryVisual({
  kind,
  description,
  className,
}: {
  kind: StoryVisualKind;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`${styles.frame} ${className ?? ''}`}
      role="img"
      aria-label={description}
      data-story-visual={kind}
    >
      <svg
        className={styles.canvas}
        viewBox="0 0 720 405"
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
