import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { About } from '@/components/About';
import { Team } from '@/components/Team';

export const metadata = {
  title: 'About',
  description:
    'Ubunifu Technologies is a digital-solutions agency in Arusha, Tanzania, helping organisations across the country with web, data, AI, branding, and strategy.',
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="About us"
          title="A digital partner that gets the local context."
          lead="We're a small, senior team in Arusha helping organisations across Tanzania build, run, and grow their digital side. Deep technical skill, a real read of the market."
        />

        <About hideHeader />
        <Team />
      </main>
      <Footer />
    </>
  );
}
