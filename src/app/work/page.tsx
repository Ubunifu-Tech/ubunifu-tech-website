import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Portfolio } from '@/components/Portfolio';
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
          lead="A selection of the websites and platforms we have shipped for businesses across Tanzania, built for performance, search visibility, and the way customers here actually browse."
        />

        <Portfolio hideHeader />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
