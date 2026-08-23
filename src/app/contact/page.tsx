import { PageHeader } from '@/components/PageHeader';
import { Contact } from '@/components/Contact';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Contact',
  description:
    'Start a project with Ubunifu Technologies, ask about a product, or talk through a problem with our team in Arusha, Tanzania.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <main>
        <PageHeader
          eyebrow="Contact"
          title="Let's build something."
          lead="Whether you're starting a custom project or have a question about one of our products, write to us. Your note goes directly to the Ubunifu team, not a chatbot."
          artwork={{
            primary: {
              src: '/editorial/home-system-hero.webp',
              alt: 'Tactile system landscape connecting business inputs into one coherent operating system',
            },
            caption: 'Bring us the problem · We will help shape the path',
          }}
        />
        <Contact hideIntro />
      </main>
    </>
  );
}
