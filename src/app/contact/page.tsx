import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageHeader } from '@/components/PageHeader';
import { Contact } from '@/components/Contact';

export const metadata = {
  title: 'Contact',
  description:
    'Start a project with Ubunifu Technologies, or ask us anything about our products. Based in Arusha, Tanzania — we reply within two business days.',
  alternates: { canonical: 'https://ubunifutech.com/contact' },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <PageHeader
          eyebrow="Contact"
          title="Let's build something."
          lead="Whether you're starting a custom project or just have a question about one of our products, write to us. A real person reads every message."
        />
        <Contact hideIntro />
      </main>
      <Footer />
    </>
  );
}
