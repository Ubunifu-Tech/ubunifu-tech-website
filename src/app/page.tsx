import { Hero } from '@/components/Hero';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { CapabilitiesIndex } from '@/components/CapabilitiesIndex';
import { WhyUbunifu } from '@/components/WhyUbunifu';
import { EngagementPaths } from '@/components/EngagementPaths';
import {
  WorkPreview,
  ProductsProof,
} from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';
import { CtaBand } from '@/components/CtaBand';
import { Insights } from '@/components/Insights';
import { getAllPosts, resolveBlogCover } from '@/lib/blog';
import { projects } from '@/content/portfolio';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Consulting + products, built in Tanzania',
  description:
    'Ubunifu Technologies is a Tanzanian technology consultancy that also builds and operates products across web, data, AI, brand, hosting, and software.',
  path: '/',
});

export default function Home() {
  const candidates = getAllPosts().slice(0, 3);
  // Keep the latest three stories, but don't repeat the project art just shown above.
  const lead = candidates.find((post) => !projects.some((project) => project.artwork.src === resolveBlogCover(post).image));
  const latestPosts = lead ? [lead, ...candidates.filter((post) => post.slug !== lead.slug)] : candidates;

  return (
    <>
      <PageAtmosphere />
      <main data-atmosphere>
        <Hero />
        <WhyUbunifu />
        <CapabilitiesIndex />
        <EngagementPaths />
        <WorkPreview />
        <Testimonial />
        <ProductsProof />
        <Insights posts={latestPosts} />
        <CtaBand />
      </main>
    </>
  );
}
