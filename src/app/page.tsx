import { Hero } from '@/components/Hero';
import { ProblemStrip } from '@/components/ProblemStrip';
import {
  ServicesPreview,
  SectorsStrip,
  WorkPreview,
  ProductsProof,
} from '@/components/HomePreviews';
import { DataFlow } from '@/components/visuals/DataFlow';
import { Testimonial } from '@/components/Testimonial';
import { CtaBand } from '@/components/CtaBand';

export default function Home() {
  return (
    <main>
      <Hero />
      <ProblemStrip />
      {/* Proof first: real client work + our own products */}
      <WorkPreview />
      <ProductsProof />
      {/* Then the offering */}
      <ServicesPreview />
      <DataFlow />
      <SectorsStrip />
      <Testimonial />
      <CtaBand />
    </main>
  );
}
