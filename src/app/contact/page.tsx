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
          variant="contact"
          register={['Project work', 'Existing systems', 'Product questions']}
          eyebrow="Contact"
          title="Tell us what needs to work better."
          lead="Bring us a project, an existing system, or a question about one of our products. Your message goes directly to the Ubunifu Technologies team."
          artwork={{
            primary: {
              src: '/editorial/home-system-hero.webp',
              alt: 'Tactile system landscape connecting business inputs into one coherent operating system',
            },
            caption: 'Conceptual illustration · From a problem to a shaped path',
          }}
        />
        <Contact hideIntro />
      </main>
    </>
  );
}
