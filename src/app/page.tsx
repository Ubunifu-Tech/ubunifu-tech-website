import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProblemStrip } from '@/components/ProblemStrip';
import {
  ServicesPreview,
  SectorsStrip,
  WorkPreview,
  ProductsProof,
  AboutPreview,
} from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';
import { TechMarquee } from '@/components/TechMarquee';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemStrip />
      <ServicesPreview />
      <SectorsStrip />
      <WorkPreview />
      <ProductsProof />
      <Testimonial />
      <TechMarquee />
      <AboutPreview />
      <Footer />
    </main>
  );
}
