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
          eyebrow="Our products"
          title="Software we build and operate ourselves."
          lead="Insight and Sifa are live products. Rafiki is in development. Each is designed around a specific workflow we understand from the work."
          artwork={{
            primary: {
              src: '/work/insight-tutor.png',
              alt: 'Ubunifu Insight tutoring interface answering in context',
              focus: 'top',
            },
            secondary: {
              src: '/work/sifa-dashboard.png',
              alt: 'Ubunifu Sifa business intelligence dashboard',
              focus: 'top',
            },
            caption: 'Products we build and operate',
            kind: 'proof',
          }}
        />

        <Products hideHeader />
      </main>
      <CtaBand />
    </>
  );
}
