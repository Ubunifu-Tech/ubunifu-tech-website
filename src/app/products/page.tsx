import { CtaBand } from '@/components/CtaBand';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PageHeader } from '@/components/PageHeader';
import { Products } from '@/components/Products';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Products',
  description:
    'Ubunifu products: Insight for working with documents and data, Sifa for business operations, and Rafiki for embeddable website tools.',
  path: '/products',
});

export default function ProductsPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <PageHeader
          scene="products"
          eyebrow="Our products"
          title="Software we build and operate ourselves."
          lead="Work with your documents, manage daily business operations, or add useful tools to a website. Explore each product and its current availability below."
        />

        <Products hideHeader />
      </main>
      <CtaBand />
    </>
  );
}
