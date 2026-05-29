import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProofBand } from '@/components/ProofBand';
import { ProblemStrip } from '@/components/ProblemStrip';
import {
  ServicesPreview,
  SectorsStrip,
  WorkPreview,
  ProductsProof,
  AboutPreview,
} from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';
import { Insights } from '@/components/Insights';
import { TechMarquee } from '@/components/TechMarquee';
import { Footer } from '@/components/Footer';
import { getAllPosts } from '@/lib/blog';

export default function Home() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBand />
      <ProblemStrip />
      <ServicesPreview />
      <SectorsStrip />
      <WorkPreview />
      <ProductsProof />
      <Testimonial />
      <Insights posts={posts} />
      <TechMarquee />
      <AboutPreview />
      <Footer />
    </main>
  );
}
