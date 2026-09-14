import type { ServiceKey } from '@/content/services';
import styles from './HomeLanding.module.css';

export function HomeHeroGraphic() {
  return (
    <svg
      className={styles.heroGraphic}
      viewBox="0 0 820 680"
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.heroField}>
        <path d="M122 246C214 92 588 68 726 222" />
        <path d="M104 430C212 604 604 628 748 438" />
        <path d="M210 118 222 105M612 566l13-13M714 390l16 2M146 492l-15 5" />
        <circle cx="214" cy="116" r="4" />
        <circle cx="622" cy="558" r="4" />
        <circle cx="724" cy="392" r="4" />
      </g>

      <ellipse className={styles.heroOrbitTrack} cx="432" cy="336" rx="326" ry="214" />
      <ellipse className={styles.heroOrbitRun} cx="432" cy="336" rx="326" ry="214" />

      <path className={styles.heroRoute} d="M28 362h150v-74h126" />
      <path className={`${styles.heroRoute} ${styles.heroRouteLate}`} d="M554 350h112v-82h126" />
      <path className={`${styles.heroRoute} ${styles.heroRouteSoft}`} d="M540 438h96v92h130" />

      <g transform="translate(74 176)">
        <g className={`${styles.heroSatellite} ${styles.heroSatelliteOne}`}>
          <rect width="126" height="92" rx="6" />
          <path d="M22 26h54M22 45h80M22 64h62" />
          <circle cx="101" cy="25" r="7" />
        </g>
      </g>

      <g transform="translate(650 112)">
        <g className={`${styles.heroSatellite} ${styles.heroSatelliteTwo}`}>
          <path d="M12 72h38V34h48" />
          <circle cx="12" cy="72" r="10" />
          <circle cx="50" cy="72" r="10" />
          <circle cx="98" cy="34" r="10" />
        </g>
      </g>

      <g transform="translate(626 474)">
        <g className={`${styles.heroSatellite} ${styles.heroSatelliteThree}`}>
          <rect x="24" y="0" width="96" height="70" rx="6" />
          <path d="M43 48 60 27l15 12 20-26M42 55h58" />
        </g>
      </g>

      <g transform="translate(82 474)">
        <g className={`${styles.heroSatellite} ${styles.heroSatelliteFour}`}>
          <polygon points="62,0 124,31 62,62 0,31" />
          <polygon points="62,19 104,40 62,61 20,40" />
        </g>
      </g>

      <polygon className={styles.heroShadow} points="430,606 680,482 430,358 180,482" />

      <g className={styles.heroAssembly}>
        <polygon className={styles.heroLayerBackLeft} points="222,457 430,560 430,584 222,481" />
        <polygon className={styles.heroLayerBackRight} points="430,560 638,457 638,481 430,584" />
        <polygon className={styles.heroLayerBack} points="430,560 638,457 430,354 222,457" />

        <polygon className={styles.heroLayerMidLeft} points="256,424 430,510 430,530 256,444" />
        <polygon className={styles.heroLayerMidRight} points="430,510 604,424 604,444 430,530" />
        <polygon className={styles.heroLayerMid} points="430,510 604,424 430,338 256,424" />

        <polygon className={styles.heroLayerTopLeft} points="292,388 430,456 430,472 292,404" />
        <polygon className={styles.heroLayerTopRight} points="430,456 568,388 568,404 430,472" />
        <polygon className={styles.heroLayerTop} points="430,456 568,388 430,320 292,388" />

        <g className={styles.heroRotor}>
          <ellipse cx="430" cy="338" rx="142" ry="70" />
          <circle cx="572" cy="338" r="8" />
          <circle cx="316" cy="296" r="6" />
          <path d="M430 268v28M430 380v28" />
        </g>

        <g className={styles.heroCore}>
          <polygon className={styles.heroCoreTop} points="430,321 506,283 430,245 354,283" />
          <polygon className={styles.heroCoreLeft} points="354,283 430,321 430,421 354,383" />
          <polygon className={styles.heroCoreRight} points="506,283 430,321 430,421 506,383" />
          <path className={styles.heroCoreSlots} d="M456 329l30-15M456 351l30-15M456 373l30-15" />
          <path className={styles.heroCoreSeam} d="M374 300v63l38 19M486 300v17" />
        </g>

        <g className={styles.heroLiveSignal}>
          <circle cx="534" cy="232" r="29" />
          <circle cx="534" cy="232" r="12" />
          <path d="M534 261v58h-48" />
        </g>

        <g className={styles.heroPackets}>
          <circle cx="326" cy="439" r="6" />
          <circle cx="548" cy="412" r="5" />
          <circle cx="430" cy="548" r="5" />
        </g>
      </g>
    </svg>
  );
}

function capabilityClass(activeKey: ServiceKey | null, key: ServiceKey) {
  return `${styles.capabilityNode} ${activeKey === key ? styles.capabilityNodeActive : ''}`;
}

function spokeClass(activeKey: ServiceKey | null, key: ServiceKey) {
  return `${styles.capabilitySpoke} ${activeKey === key ? styles.capabilitySpokeActive : ''}`;
}

function pulseClass(activeKey: ServiceKey | null, key: ServiceKey) {
  return `${styles.capabilityPulse} ${activeKey === key ? styles.capabilityPulseActive : ''}`;
}

export function CapabilityOrbitGraphic({ activeKey }: { activeKey: ServiceKey | null }) {
  return (
    <svg
      className={styles.capabilityGraphic}
      viewBox="0 0 720 560"
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.capabilityGrid}>
        <path d="M150 352 360 456 570 352M190 332 360 416 530 332M230 312 360 376 490 312" />
        <path d="M220 387 360 318 500 387M280 417 420 348M300 348 440 417" />
      </g>

      <ellipse className={styles.capabilityTrack} cx="360" cy="276" rx="282" ry="196" />
      <ellipse className={styles.capabilityRunner} cx="360" cy="276" rx="282" ry="196" />

      <path className={spokeClass(activeKey, 'web')} d="M360 292C284 294 226 284 128 276" />
      <path className={spokeClass(activeKey, 'hosting')} d="M346 278C314 226 278 179 220 102" />
      <path className={spokeClass(activeKey, 'branding')} d="M374 278C406 226 442 179 500 102" />
      <path className={spokeClass(activeKey, 'data')} d="M360 292C436 294 494 284 592 276" />
      <path className={spokeClass(activeKey, 'ai')} d="M374 310C414 354 450 394 500 432" />
      <path className={spokeClass(activeKey, 'strategy')} d="M346 310C306 354 270 394 220 432" />

      <circle className={pulseClass(activeKey, 'web')} cx="222" cy="287" r="5" />
      <circle className={pulseClass(activeKey, 'hosting')} cx="285" cy="190" r="5" />
      <circle className={pulseClass(activeKey, 'branding')} cx="435" cy="190" r="5" />
      <circle className={pulseClass(activeKey, 'data')} cx="498" cy="287" r="5" />
      <circle className={pulseClass(activeKey, 'ai')} cx="444" cy="383" r="5" />
      <circle className={pulseClass(activeKey, 'strategy')} cx="276" cy="383" r="5" />

      <g className={styles.capabilityHub}>
        <polygon className={styles.capabilityHubShadow} points="360,430 508,356 360,282 212,356" />
        <polygon className={styles.capabilityHubLeft} points="236,338 360,400 360,426 236,364" />
        <polygon className={styles.capabilityHubRight} points="360,400 484,338 484,364 360,426" />
        <polygon className={styles.capabilityHubBase} points="360,400 484,338 360,276 236,338" />
        <polygon className={styles.capabilityHubTop} points="360,342 430,307 360,272 290,307" />
        <polygon className={styles.capabilityCoreLeft} points="320,286 360,306 360,354 320,334" />
        <polygon className={styles.capabilityCoreRight} points="400,286 360,306 360,354 400,334" />
        <polygon className={styles.capabilityCoreTop} points="360,266 400,286 360,306 320,286" />
        <ellipse className={styles.capabilityHubRing} cx="360" cy="286" rx="58" ry="29" />
        <circle className={styles.capabilityHubCore} cx="418" cy="286" r="8" />
      </g>

      <g transform="translate(76 230)">
        <g className={capabilityClass(activeKey, 'web')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <path d="M19 30h66v43H19zM19 41h66M29 35h2M38 35h2M31 55h20M31 63h36" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>

      <g transform="translate(168 56)">
        <g className={capabilityClass(activeKey, 'hosting')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <path d="M21 29h62v12H21zM21 46h62v12H21zM21 63h62v12H21z" />
          <circle cx="73" cy="35" r="2" />
          <circle cx="73" cy="52" r="2" />
          <circle cx="73" cy="69" r="2" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>

      <g transform="translate(448 56)">
        <g className={capabilityClass(activeKey, 'branding')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <circle cx="39" cy="48" r="18" />
          <path d="M56 29 78 48 55 70M27 73h50M39 30v36" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>

      <g transform="translate(540 230)">
        <g className={capabilityClass(activeKey, 'data')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <path d="M25 71V55M41 71V39M57 71V48M73 71V29M21 71h58M25 50l16-17 16 8 16-20" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>

      <g transform="translate(448 386)">
        <g className={capabilityClass(activeKey, 'ai')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <path d="M52 28v10M52 61v10M29 50h10M65 50h10M35 34l7 7M62 59l7 7M69 34l-7 7M42 59l-7 7" />
          <circle cx="52" cy="50" r="14" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>

      <g transform="translate(168 386)">
        <g className={capabilityClass(activeKey, 'strategy')}>
          <polygon className={styles.capabilityNodeDepth} points="8,92 96,92 88,100 16,100" />
          <rect width="104" height="92" rx="7" />
          <path className={styles.capabilityNodeAccent} d="M16 15h35" />
          <circle cx="52" cy="51" r="23" />
          <path d="m52 51 13-20-5 25-21 13 13-18z" />
          <circle className={styles.capabilityNodeSignal} cx="87" cy="15" r="4" />
        </g>
      </g>
    </svg>
  );
}

export function EngagementPathGraphic({ kind }: { kind: 'consulting' | 'products' }) {
  if (kind === 'consulting') {
    return (
      <svg className={styles.pathGraphic} viewBox="0 0 620 280" aria-hidden="true" focusable="false">
        <path className={styles.pathRouteSoft} d="M38 72h128v66h90M38 138h218M38 204h128v-66" />
        <circle className={styles.pathNode} cx="38" cy="72" r="8" />
        <circle className={styles.pathNode} cx="38" cy="138" r="8" />
        <circle className={styles.pathNode} cx="38" cy="204" r="8" />
        <path className={styles.pathRouteLive} d="M256 138h76" />
        <g className={styles.pathAssembly}>
          <polygon className={styles.pathPlaneBack} points="430,231 560,166 430,101 300,166" />
          <polygon className={styles.pathPlaneTop} points="430,195 526,147 430,99 334,147" />
          <polygon className={styles.pathCoreTop} points="430,122 480,97 430,72 380,97" />
          <polygon className={styles.pathCoreLeft} points="380,97 430,122 430,186 380,161" />
          <polygon className={styles.pathCoreRight} points="480,97 430,122 430,186 480,161" />
          <circle className={styles.pathAccent} cx="514" cy="82" r="12" />
        </g>
      </svg>
    );
  }

  return (
    <svg className={styles.pathGraphic} viewBox="0 0 620 280" aria-hidden="true" focusable="false">
      <g className={styles.productCoreSmall}>
        <polygon className={styles.pathCoreTop} points="210,120 266,92 210,64 154,92" />
        <polygon className={styles.pathCoreLeft} points="154,92 210,120 210,192 154,164" />
        <polygon className={styles.pathCoreRight} points="266,92 210,120 210,192 266,164" />
      </g>
      <path className={styles.pathRouteLive} d="M266 142h96v-72h84M362 142h84M362 142v72h84" />
      <g className={styles.productOutputs}>
        <rect x="446" y="42" width="112" height="60" rx="6" />
        <rect x="446" y="112" width="112" height="60" rx="6" />
        <rect x="446" y="182" width="112" height="60" rx="6" />
        <path d="M466 66h47M466 79h70M466 136h57M466 149h70M466 206h39M466 219h70" />
      </g>
      <circle className={styles.pathAccent} cx="362" cy="142" r="11" />
    </svg>
  );
}
