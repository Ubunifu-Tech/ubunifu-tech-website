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
          eyebrow="Our work"
          title="Systems running in the real world."
          lead="Client work, shown honestly: the situation, the system we delivered, and the evidence we can stand behind."
          artwork={{
            primary: {
              src: '/work/safari-king-admin.png',
              alt: 'Safari King operations dashboard built by Ubunifu',
              focus: 'top',
            },
            secondary: {
              src: '/work/usambara-hero.png',
              alt: 'Usambara Destination website built by Ubunifu',
              focus: 'top',
            },
            caption: 'Live client systems · Tanzania',
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
