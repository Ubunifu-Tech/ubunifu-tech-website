import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/console/auth';
import { SettingsTabs } from '../SettingsTabs';
import { AddProduct, ProductMenu } from './ProductForms';
import styles from '../../Admin.module.css';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';

export const metadata = { title: 'Products' };

/**
 * What we build and sell ourselves. The reports follow each one's money on
 * its own: projects that are its customers, income it collects, and the
 * costs of running it.
 */
export default async function ProductsSettingsPage() {
  const staff = await requirePermission('finance');
  const products = await db.product.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { projects: { where: { deletedAt: null } }, income: true, costs: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.headText}>
          <h1 className={styles.heading}>Settings</h1>
          <p className={styles.lead}>The products we build and sell ourselves.</p>
        </div>
      </div>

      <SettingsTabs current="products" staff={staff} />

      <div className={styles.stack}>
        <div className={table.frame}>
          <div className={table.toolbar}>
            <div className={table.toolbarText}>
              <h2 className={table.title}>Products</h2>
              <span className={table.count}>{products.length}</span>
            </div>
          </div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    Product
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Customer projects
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Income entries
                  </th>
                  <th className={`${table.th} ${table.numericHead}`} scope="col">
                    Costs
                  </th>
                  <th className={table.th} scope="col">
                    State
                  </th>
                  <th className={`${table.th} ${table.actionsHead}`} scope="col">
                    <span className={table.muted}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td className={table.emptyCell} colSpan={6}>
                      <p className={table.emptyTitle}>No products yet.</p>
                      <p className={table.emptyHint}>Add the first one below.</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className={table.tr}>
                      <td className={`${table.td} ${table.primary}`}>{product.name}</td>
                      <td className={`${table.td} ${table.numeric}`}>{product._count.projects}</td>
                      <td className={`${table.td} ${table.numeric}`}>{product._count.income}</td>
                      <td className={`${table.td} ${table.numeric}`}>{product._count.costs}</td>
                      <td className={table.td}>
                        {product.isActive ? 'Offered' : <span className={table.muted}>Stopped</span>}
                      </td>
                      <td className={`${table.td} ${table.actions}`}>
                        <ProductMenu product={product} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <section className={forms.card}>
          <div className={forms.cardHeader}>
            <h2 className={forms.cardTitle}>Add a product</h2>
          </div>
          <AddProduct />
          <p className={forms.hint}>
            Link a customer&rsquo;s project to it from the project&rsquo;s details, and add what it
            collects on the{' '}
            <Link href="/finance/income" className={styles.inlineLink}>
              Income
            </Link>{' '}
            page.
          </p>
        </section>
      </div>
    </main>
  );
}
