import { CtaBand } from '@/components/CtaBand';
import { PageHeader } from '@/components/PageHeader';
import { Portfolio } from '@/components/Portfolio';
import { Testimonial } from '@/components/Testimonial';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Our Work',
  description:
    'Production websites and operations platforms Ubunifu has shipped for clients in Tanzania.',
  path: '/work',
});

export default function WorkPage() {
  return (
    <>
      <main>
        <PageHeader
          variant="proof"
          register={['Situation', 'Delivered system', 'Live work']}
          eyebrow="Our work"
          title="Client systems built around the work behind the screen."
          lead="See what each client needed, what we delivered, and the workflow the system now supports."
          artwork={{
            primary: {
              src: '/editorial/safari-operations-system-v2.webp',
              alt: 'Editorial illustration of a safari enquiry becoming a connected operating workflow',
            },
            secondary: {
              src: '/editorial/usambara-enquiry-journey-v2.webp',
              alt: 'Editorial illustration of destination discovery becoming a structured trip enquiry',
            },
            caption: 'Conceptual illustration · Two delivered client workflows',
            kind: 'proof',
          }}
        />

        <Portfolio hideHeader />
        <Testimonial />
      </main>
      <CtaBand />
    </>
  );
}
