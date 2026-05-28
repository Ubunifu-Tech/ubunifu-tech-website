import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Portfolio } from '@/components/Portfolio';
import { Testimonial } from '@/components/Testimonial';
import { Contact } from '@/components/Contact';

export const metadata = {
  title: 'Our Work',
  description:
    'Selected platforms and websites designed and built by Ubunifu Technologies for businesses across Tanzania.',
};

export default function WorkPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Our work"
          title="Platforms we have designed and built."
          lead="A selection of the websites, custom CRMs, and AI-augmented platforms we have shipped for businesses across Tanzania."
        />

        <Portfolio hideHeader />
        <Testimonial />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
