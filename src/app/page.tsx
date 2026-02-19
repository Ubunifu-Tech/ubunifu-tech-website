import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProblemStrip } from '@/components/ProblemStrip';
import { Products } from '@/components/Products';
import { About } from '@/components/About';
import { Portfolio } from '@/components/Portfolio';
import { Contact } from '@/components/Contact';
import { Footer } from '@/components/Footer';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ScrollReveal>
        <ProblemStrip />
      </ScrollReveal>
      <ScrollReveal>
        <Products />
      </ScrollReveal>
      <ScrollReveal>
        <About />
      </ScrollReveal>
      <ScrollReveal>
        <Portfolio />
      </ScrollReveal>
      <ScrollReveal>
        <Contact />
      </ScrollReveal>
      <Footer />
    </main>
  );
}
