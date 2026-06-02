import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { Products } from '@/components/Products';

export const metadata = {
  title: 'Products',
  description:
    'Ubunifu products: Insight (AI document intelligence), Sifa (business management for Tanzanian SMBs), Rafiki (embeddable website widgets), and Build (custom software and consulting).',
};

export default function ProductsPage() {
  return (
    <>
      <main>
        <PageHeader
          eyebrow="Our products"
          title="Software products for African businesses."
          lead="Each product solves a real problem for businesses in Tanzania. Pay-as-you-go pricing, no annual lock-in, and a free tier where it makes sense."
        />

        <Products hideHeader />
      </main>
      <CtaBand />
    </>
  );
}
