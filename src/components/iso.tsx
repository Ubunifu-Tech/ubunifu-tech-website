import styles from './iso.module.css';

/**
 * Shared isometric primitives.
 *
 * Faces take their fill from three CSS custom properties, so a consumer sets the
 * palette once on a wrapper and every shape inside follows:
 *   --iso-top    the lit face
 *   --iso-front  the mid face
 *   --iso-side   the dark face
 *   --iso-plane  flat planes with no depth
 *   --iso-edge   hairline on flat planes
 *
 * Used by the shared page, story, project, and service diagrams so every
 * illustration speaks the same geometric language.
 */

/** Default half-width and half-height of the isometric unit. */
export const ISO_W = 58;
export const ISO_H = 29;

type PlaneProps = {
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  className?: string;
};

type BoxProps = PlaneProps & { d: number };

/** A flat plane with no depth — a document, a panel, a layer in a stack. */
export function IsoPlane({ cx, cy, w = ISO_W, h = ISO_H, className = '' }: PlaneProps) {
  return (
    <polygon
      className={`${styles.plane} ${className}`}
      points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`}
    />
  );
}

/** A solid box: top face plus its two visible side faces. */
export function IsoBox({ cx, cy, w = ISO_W, h = ISO_H, d, className = '' }: BoxProps) {
  return (
    <g className={className}>
      <polygon
        className={styles.side}
        points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx - w},${cy + d}`}
      />
      <polygon
        className={styles.front}
        points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + d} ${cx + w},${cy + d}`}
      />
      <polygon
        className={styles.top}
        points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`}
      />
    </g>
  );
}

/**
 * An open container — a tray or inbox. Same footprint as a box but with the top
 * face cut away and an inner floor, so it reads as something things arrive into.
 */
export function IsoTray({ cx, cy, w = ISO_W, h = ISO_H, d, className = '' }: BoxProps) {
  const lip = Math.round(d * 0.45);
  return (
    <g className={className}>
      <polygon
        className={styles.side}
        points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + lip} ${cx - w},${cy + lip}`}
      />
      <polygon
        className={styles.front}
        points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + lip} ${cx + w},${cy + lip}`}
      />
      <polygon
        className={styles.floor}
        points={`${cx},${cy - h * 0.55} ${cx + w * 0.62},${cy} ${cx},${cy + h * 0.55} ${cx - w * 0.62},${cy}`}
      />
    </g>
  );
}
