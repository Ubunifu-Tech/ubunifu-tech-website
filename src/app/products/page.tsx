import { CtaBand } from '@/components/CtaBand';
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
      <main>
        <PageHeader
          variant="proof"
          register={['Workflow', 'Product', 'Current status']}
          eyebrow="Our products"
          title="Software we build and operate ourselves."
          lead="Insight and Sifa are live products. Rafiki is in development. Each is designed around a specific workflow we understand from the work."
          artwork={{
            primary: {
              src: '/editorial/ubunifu-product-family-v2.webp',
              alt: 'Three connected tactile instruments representing the workflows behind Ubunifu Insight, Sifa, and Rafiki',
            },
            caption: 'Conceptual illustration · The Ubunifu product family',
          }}
        />

        <Products hideHeader />
      </main>
      <CtaBand />
    </>
  );
}
