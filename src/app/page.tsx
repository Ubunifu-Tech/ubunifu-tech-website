import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Products } from '@/components/Products';
import { Portfolio } from '@/components/Portfolio';
import { About } from '@/components/About';
import { Contact } from '@/components/Contact';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Products />
      <Portfolio />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
