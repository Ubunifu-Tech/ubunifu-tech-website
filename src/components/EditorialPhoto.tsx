import Image from 'next/image';
import type { EditorialPhoto as EditorialPhotoAsset } from '@/content/editorial-photography';
import styles from './EditorialPhoto.module.css';

type EditorialPhotoProps = {
  asset: EditorialPhotoAsset;
  sizes: string;
};

export function EditorialPhoto({ asset, sizes }: EditorialPhotoProps) {
  return (
    <div
      className={styles.composition}
      data-detail-side={asset.detailSide ?? 'right'}
      data-editorial-photo
    >
      <div className={styles.frame}>
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          sizes={sizes}
          quality={80}
          className={styles.image}
          style={{ objectPosition: asset.focalPosition ?? '50% 50%' }}
        />
      </div>

      <div className={styles.detail} aria-hidden="true">
        <Image
          src={asset.src}
          alt=""
          fill
          sizes="(max-width: 760px) 116px, 180px"
          quality={80}
          className={styles.detailImage}
          style={{
            objectPosition: asset.detailPosition,
            transformOrigin: asset.detailPosition,
          }}
        />
      </div>
    </div>
  );
}
