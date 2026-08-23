import { Hero } from '@/components/Hero';
import { ProblemStrip } from '@/components/ProblemStrip';
import {
  WorkPreview,
  ProductsProof,
} from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';
import { CtaBand } from '@/components/CtaBand';
import { Insights } from '@/components/Insights';
import { getAllPosts } from '@/lib/blog';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Consulting + products, built in Tanzania',
  description:
    'Ubunifu is an Arusha-based consulting company and product studio. We advise, design, build, host, and operate web, data, AI, brand, and software systems.',
  path: '/',
});

export default function Home() {
  const latestPosts = getAllPosts().slice(0, 3);

  return (
    <main>
      <Hero />
      <ProblemStrip />
      <WorkPreview />
      <Testimonial />
      <ProductsProof />
      <Insights posts={latestPosts} />
      <CtaBand />
    </main>
  );
}
