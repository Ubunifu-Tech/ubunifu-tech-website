import { CtaBand } from '@/components/CtaBand';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PageHeader } from '@/components/PageHeader';
import { Products } from '@/components/Products';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Products',
  description:
    'Ubunifu Sifa is software for running a shop, restaurant or distributor. We are also developing Ubunifu Rafiki, tools you can add to an existing website.',
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
          title="Software we build and run"
          lead="Sifa is live, and Rafiki is in development."
        />

        <Products hideHeader />
      </main>
      <CtaBand />
    </>
  );
}
