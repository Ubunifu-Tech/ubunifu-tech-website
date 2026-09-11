import { PageHeader } from '@/components/PageHeader';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { Contact } from '@/components/Contact';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Contact',
  description:
    'Start a project with Ubunifu Technologies, ask about a product, or talk through a problem with our team in Tanzania.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <PageHeader
          ambient={false}
          scene="contact"
          compact
          eyebrow="Contact"
          title="Tell us about your project."
          lead="Ask about our services, get help with a product, or discuss a project with our team."
        />
        <Contact hideIntro />
      </main>
    </>
  );
}
