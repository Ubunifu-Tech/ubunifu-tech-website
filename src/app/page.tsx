import { Hero } from '@/components/Hero';
import { EngagementPaths } from '@/components/EngagementPaths';
import { CapabilitiesIndex } from '@/components/CapabilitiesIndex';
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
    'Ubunifu Technologies is an Arusha-based technology consultancy that also builds and operates products across web, data, AI, brand, hosting, and software.',
  path: '/',
});

export default function Home() {
  const latestPosts = getAllPosts().slice(0, 3);

  return (
    <main>
      <Hero />
      <EngagementPaths />
      <CapabilitiesIndex />
      <WorkPreview />
      <Testimonial />
      <ProductsProof />
      <ProblemStrip />
      <Insights posts={latestPosts} />
      <CtaBand />
    </main>
  );
}
