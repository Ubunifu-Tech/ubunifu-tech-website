import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProblemStrip } from '@/components/ProblemStrip';
import { ProductsPreview, WorkPreview, AboutPreview } from '@/components/HomePreviews';
import { Testimonial } from '@/components/Testimonial';
import { TechMarquee } from '@/components/TechMarquee';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemStrip />
      <ProductsPreview />
      <WorkPreview />
      <Testimonial />
      <TechMarquee />
      <AboutPreview />
      <Footer />
    </main>
  );
}
