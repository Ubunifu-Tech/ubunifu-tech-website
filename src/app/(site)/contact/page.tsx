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
          scene="contact"
          hideVisualOnPhone
          eyebrow="Contact"
          title="Contact us"
          lead="Ask about a project or our services, or get help with one of our products."
        />
        <Contact hideIntro />
      </main>
    </>
  );
}
