import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { formatDate } from '@/lib/console/money';
import { mediaPath, mediaUsage } from '@/lib/console/media';
import { fileSize } from '@/lib/console/uploads';
import { pageNumber, pageWindow } from '@/lib/console/paging';
import { ListFooter } from '@/components/console/ListToolbar';
import { RemoveImage } from './RemoveImage';
import styles from '../../Admin.module.css';
import table from '@/styles/table.module.css';
import journal from '../Journal.module.css';

export const metadata = { title: 'Images' };

/**
 * Every image uploaded for the website, and where each one is used. An image
 * no post or writer uses can be taken off the site.
 */
export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('journal');
  const { page } = await searchParams;

  const total = await db.mediaAsset.count({ where: { deletedAt: null } });
  const shown = pageWindow(pageNumber(page), total);
  const assets = await db.mediaAsset.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    skip: shown.skip,
    take: shown.take,
    select: { id: true, extension: true, filename: true, sizeBytes: true, createdAt: true },
  });
  const usage = await mediaUsage(assets);

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <Link href="/posts" className={styles.backLink}>
            ← Journal
          </Link>
          <h1 className={styles.heading}>Images</h1>
          <p className={styles.lead}>
            Everything uploaded for the website. An image no post or writer uses can be removed,
            and its address stops working.
          </p>
        </div>
      </div>

      <div className={table.frame}>
        <div className={table.toolbar}>
          <div className={table.toolbarText}>
            <h2 className={table.title}>On the website</h2>
            <span className={table.count}>{total}</span>
          </div>
        </div>
        <div className={table.scroll}>
          <table className={`${table.table} ${table.compact}`}>
            <thead>
              <tr>
                <th className={table.th} scope="col">
                  Image
                </th>
                <th className={table.th} scope="col">
                  File name
                </th>
                <th className={`${table.th} ${table.numericHead}`} scope="col">
                  Size
                </th>
                <th className={table.th} scope="col">
                  Uploaded
                </th>
                <th className={table.th} scope="col">
                  Used in
                </th>
                <th className={`${table.th} ${table.actionsHead}`} scope="col">
                  <span className="srOnly">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td className={table.emptyCell} colSpan={6}>
                    <p className={table.emptyTitle}>No images yet.</p>
                    <p className={table.emptyHint}>
                      Images added to a post or a writer&rsquo;s photo show here.
                    </p>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const path = mediaPath(asset);
                  const usedIn = usage.get(path);
                  return (
                    <tr key={asset.id} className={table.tr}>
                      <td className={table.td}>
                        <span className={journal.thumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- a small console thumbnail of an uploaded image. */}
                          <img src={path} alt="" className={journal.thumbImage} />
                        </span>
                      </td>
                      <td className={`${table.td} ${table.primary}`}>{asset.filename}</td>
                      <td className={`${table.td} ${table.numeric} ${table.nowrap}`}>
                        {fileSize(asset.sizeBytes)}
                      </td>
                      <td className={`${table.td} ${table.nowrap}`}>{formatDate(asset.createdAt)}</td>
                      <td className={table.td}>
                        {usedIn ? usedIn.join(', ') : <span className={table.muted}>Not used</span>}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        {!usedIn && <RemoveImage mediaId={asset.id} filename={asset.filename} />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <ListFooter
          shown={assets.length}
          total={total}
          noun={['image', 'images']}
          paging={{ page: shown.page, path: '/posts/images', params: {} }}
        />
      </div>
    </main>
  );
}
