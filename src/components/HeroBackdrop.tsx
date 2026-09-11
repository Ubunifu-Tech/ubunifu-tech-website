import Image from 'next/image';
import { AmbientShader } from './AmbientShader';
import { HeroSystem } from './HeroSystem';
import { heroScenes, type HeroScene } from '@/content/hero-scenes';
import styles from './HeroBackdrop.module.css';

/**
 * Static background: no scroll listeners, canvas, autoplay or duplicate image layers.
 *
 * `ambient` adds the WebGL light field, masked to suit the scrim shape.
 *
 * `align` selects the scrim shape. 'center' darkens evenly, for headers whose copy
 * sits in the middle. 'left' darkens only the copy column and clears to the right,
 * so the illustration is actually visible instead of being flattened to a dark fill.
 */
export function HeroBackdrop({
  scene,
  align = 'center',
  ambient = false,
  drawn = false,
}: {
  scene: HeroScene;
  align?: 'center' | 'left';
  ambient?: boolean;
  /** Use the drawn SVG system instead of the generated raster scene. */
  drawn?: boolean;
}) {
  return (
    <div
      className={`${styles.backdrop} ${align === 'left' ? styles.alignLeft : ''}`}
      aria-hidden="true"
      data-hero-art={scene}
      {...(drawn ? { 'data-hero-drawn': '' } : {})}
    >
      {drawn ? (
        <HeroSystem />
      ) : (
        <Image
          src={heroScenes[scene]}
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.image}
          draggable={false}
        />
      )}
      {ambient && <AmbientShader placement={align === 'left' ? 'left' : 'edges'} />}
    </div>
  );
}
