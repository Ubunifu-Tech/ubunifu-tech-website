import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { Team } from '@/components/Team';

export const metadata = {
  title: 'About',
  description:
    'Ubunifu Technologies is a small software team in Arusha, Tanzania, building products and consulting for African businesses, built from local workflows rather than adapted from elsewhere.',
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="About us"
          title="Software built for Africa, from Africa."
          lead="We are a small team in Arusha, Tanzania, building products and consulting for the businesses around us. We start from how this market actually works, not from tools made for somewhere else."
        />

        <About hideHeader />
        <Team />
      </main>
      <Footer />
    </>
  );
}
