import { Navbar } from '@/components/Navbar';
import { CtaBand } from '@/components/CtaBand';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Portfolio } from '@/components/Portfolio';
import { ProductsProof } from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';

export const metadata = {
  title: 'Our Work',
  description:
    'Platforms, custom CRMs, and AI-augmented sites Ubunifu has shipped for clients across Tanzania, plus our own live SaaS products, Insight and Sifa.',
};

export default function WorkPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Our work"
          title="Built for clients, and for ourselves."
          lead="Custom platforms and sites for businesses across Tanzania, plus the SaaS products we design, build, and run ourselves."
        />

        <Portfolio hideHeader />
        <ProductsProof />
        <Testimonial />
      </main>
      <CtaBand />
      <Footer />
    </>
  );
}
