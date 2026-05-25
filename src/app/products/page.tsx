import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Products } from '@/components/Products';
import { Clients } from '@/components/Clients';
import { Contact } from '@/components/Contact';

export const metadata = {
  title: 'Products',
  description:
    'Ubunifu products: Insight (AI document intelligence), Sifa (business management for Tanzanian SMBs), Rafiki (embeddable website widgets), and Build (custom software and consulting).',
};

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Our products"
          title="Software products for African businesses."
          lead="Each product solves a real problem for businesses in Tanzania, priced pay-as-you-go and supported the way this market actually works."
        />

        <Products hideHeader />
        <Clients />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
