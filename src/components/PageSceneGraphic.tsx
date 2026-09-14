import { IsoBox, IsoPlane, IsoTray } from './iso';
import styles from './PageSceneGraphic.module.css';

export type PageScene =
  | 'services'
  | 'work'
  | 'products'
  | 'about'
  | 'industries'
  | 'contact'
  | 'journal'
  | 'careers'
  | 'brand'
  | 'privacy';

const descriptions: Record<PageScene, string> = {
  services: 'Six connected capabilities resolving into one shared technology system.',
  work: 'Two completed systems connected to a shared operational route.',
  products: 'Three related software products assembled on one shared platform.',
  about: 'A connected technology workbench built from several working parts.',
  industries: 'Several sector nodes connected by one common technology route.',
  contact: 'A request travelling between two connected endpoints.',
  journal: 'Loose working notes resolving into one organised stack.',
  careers: 'A sequence of steps leading toward an open place in the system.',
  brand: 'Two interlocking forms representing the orange and violet identity.',
  privacy: 'A protected message travelling through a controlled route.',
};

function Stack({
  cx,
  cy,
  width,
  count = 3,
}: {
  cx: number;
  cy: number;
  width: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <IsoPlane
          key={index}
          className={index === count - 1 ? styles.litPlane : styles.softPlane}
          cx={cx}
          cy={cy - index * 18}
          w={width - index * 7}
          h={(width - index * 7) / 2}
        />
      ))}
    </>
  );
}

function ServicesScene() {
  const nodes = [
    [116, 106],
    [116, 220],
    [116, 334],
    [524, 106],
    [524, 220],
    [524, 334],
  ];

  return (
    <>
      <g className={styles.routes}>
        <path d="M144 106 H230 V180 H276" />
        <path d="M144 220 H276" />
        <path d="M144 334 H230 V260 H276" />
        <path d="M496 106 H410 V180 H364" />
        <path d="M496 220 H364" />
        <path className={styles.liveRoute} d="M496 334 H410 V260 H364" />
      </g>
      {nodes.map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <rect className={styles.nodePanel} x={cx - 27} y={cy - 20} width="54" height="40" rx="4" />
          <path
            className={styles.nodeMark}
            d={index % 2 === 0
              ? `M${cx - 12} ${cy - 6} H${cx + 12} M${cx - 12} ${cy + 5} H${cx + 5}`
              : `M${cx - 11} ${cy + 8} V${cy - 5} M${cx} ${cy + 8} V${cy - 12} M${cx + 11} ${cy + 8} V${cy}`}
          />
        </g>
      ))}
      <IsoPlane className={styles.basePlane} cx={320} cy={286} w={92} h={46} />
      <IsoBox className={styles.coreBox} cx={320} cy={202} w={48} h={24} d={58} />
      <circle className={styles.signal} cx="410" cy="334" r="8" />
    </>
  );
}

function WorkScene() {
  return (
    <>
      <path className={styles.guideRoute} d="M96 326 H544" />
      <path className={styles.liveRoute} d="M214 326 V274 H426 V326" />
      <Stack cx={198} cy={264} width={72} />
      <Stack cx={442} cy={264} width={72} />
      <circle className={styles.ring} cx="198" cy="160" r="22" />
      <circle className={styles.signal} cx="198" cy="160" r="9" />
      <circle className={styles.ring} cx="442" cy="160" r="22" />
      <circle className={styles.signal} cx="442" cy="160" r="9" />
      <path className={styles.guideRoute} d="M198 182 V200 M442 182 V200" />
    </>
  );
}

function ProductsScene() {
  return (
    <>
      <path className={styles.guideRoute} d="M92 326 H548" />
      <path className={styles.liveRoute} d="M178 326 V282 M320 326 V262 M462 326 V282" />
      <Stack cx={178} cy={252} width={58} />
      <IsoBox className={styles.coreBox} cx={320} cy={210} w={48} h={24} d={58} />
      <IsoTray className={styles.orangeBox} cx={462} cy={252} w={58} h={29} d={42} />
      <circle className={styles.signal} cx="320" cy="326" r="8" />
    </>
  );
}

function AboutScene() {
  return (
    <>
      <path className={styles.guideRoute} d="M84 312 H556" />
      <path className={styles.liveRoute} d="M126 312 V238 H264 V190 H374 V238 H514 V312" />
      <IsoPlane className={styles.basePlane} cx={320} cy={298} w={160} h={80} />
      <Stack cx={260} cy={240} width={62} />
      <IsoBox className={styles.coreBox} cx={386} cy={205} w={44} h={22} d={52} />
      <circle className={styles.node} cx="126" cy="312" r="9" />
      <circle className={styles.signal} cx="514" cy="312" r="9" />
    </>
  );
}

function IndustriesScene() {
  const xs = [92, 182, 274, 366, 458, 548];
  return (
    <>
      <path className={styles.liveRoute} d="M74 286 H566" />
      {xs.map((x, index) => (
        <g key={x}>
          <path className={styles.guideRoute} d={`M${x} 286 V230`} />
          {index % 3 === 0 && <circle className={styles.sectorShape} cx={x} cy="204" r="23" />}
          {index % 3 === 1 && <rect className={styles.sectorShape} x={x - 23} y="181" width="46" height="46" rx="4" />}
          {index % 3 === 2 && <path className={styles.sectorShape} d={`M${x} 176 L${x + 27} 226 H${x - 27} Z`} />}
          <circle className={index === 0 ? styles.signal : styles.node} cx={x} cy="286" r="7" />
        </g>
      ))}
    </>
  );
}

function ContactScene() {
  return (
    <>
      <path className={styles.guideRoute} d="M184 226 H270 V178 H370 V226 H456" />
      <path className={styles.liveRoute} d="M184 226 H270 V276 H370 V226 H456" />
      <IsoTray className={styles.coreBox} cx={126} cy={220} w={62} h={31} d={52} />
      <IsoTray className={styles.orangeBox} cx={514} cy={220} w={62} h={31} d={52} />
      <circle className={styles.node} cx="270" cy="226" r="8" />
      <circle className={styles.signal} cx="370" cy="226" r="9" />
    </>
  );
}

function JournalScene() {
  return (
    <>
      <IsoPlane className={styles.softPlane} cx={132} cy={164} w={66} h={33} />
      <IsoPlane className={styles.softPlane} cx={164} cy={224} w={66} h={33} />
      <IsoPlane className={styles.softPlane} cx={128} cy={288} w={66} h={33} />
      <path className={styles.guideRoute} d="M212 164 H284 V220 H346" />
      <path className={styles.guideRoute} d="M230 224 H346" />
      <path className={styles.liveRoute} d="M212 288 H284 V252 H346" />
      <Stack cx={446} cy={258} width={78} count={4} />
      <circle className={styles.signal} cx="284" cy="252" r="8" />
    </>
  );
}

function CareersScene() {
  return (
    <>
      <path className={styles.liveRoute} d="M96 296 H196 V236 H302 V176 H418" />
      <circle className={styles.node} cx="96" cy="296" r="9" />
      <circle className={styles.node} cx="196" cy="236" r="9" />
      <circle className={styles.signal} cx="302" cy="176" r="9" />
      <IsoTray className={styles.coreBox} cx={492} cy={174} w={70} h={35} d={48} />
      <path className={styles.guideRoute} d="M492 244 V320 H550" />
    </>
  );
}

function BrandScene() {
  return (
    <>
      <IsoBox className={styles.orangeBox} cx={276} cy={174} w={68} h={34} d={88} />
      <IsoBox className={styles.coreBox} cx={364} cy={218} w={68} h={34} d={88} />
      <path className={styles.liveRoute} d="M116 338 H258 V304 H382 V338 H524" />
      <circle className={styles.signal} cx="258" cy="338" r="8" />
      <circle className={styles.node} cx="382" cy="338" r="8" />
    </>
  );
}

function PrivacyScene() {
  return (
    <>
      <path className={styles.guideRoute} d="M104 292 H240 V220 H400 V292 H536" />
      <path className={styles.liveRoute} d="M104 292 H240 V338 H400 V292 H536" />
      <path className={styles.envelope} d="M248 154 H392 V250 H248 Z M248 154 L320 212 L392 154" />
      <rect className={styles.lockBody} x="298" y="250" width="44" height="42" rx="4" />
      <path className={styles.lockLine} d="M306 250 V236 C306 218 334 218 334 236 V250" />
      <circle className={styles.signal} cx="320" cy="271" r="5" />
    </>
  );
}

function Scene({ scene }: { scene: PageScene }) {
  switch (scene) {
    case 'services':
      return <ServicesScene />;
    case 'work':
      return <WorkScene />;
    case 'products':
      return <ProductsScene />;
    case 'about':
      return <AboutScene />;
    case 'industries':
      return <IndustriesScene />;
    case 'contact':
      return <ContactScene />;
    case 'journal':
      return <JournalScene />;
    case 'careers':
      return <CareersScene />;
    case 'brand':
      return <BrandScene />;
    case 'privacy':
      return <PrivacyScene />;
  }
}

export function PageSceneGraphic({ scene }: { scene: PageScene }) {
  return (
    <div className={styles.frame} role="img" aria-label={descriptions[scene]} data-page-scene={scene}>
      <svg
        className={styles.canvas}
        viewBox="0 0 640 440"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className={styles.cornerGuide} d="M48 92 H104 M536 348 H592" />
        <Scene scene={scene} />
      </svg>
    </div>
  );
}
