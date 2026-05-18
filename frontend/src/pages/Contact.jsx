import { Mail, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import CinematicHero from '../components/CinematicHero.jsx';
import Reveal from '../components/Reveal.jsx';

export default function Contact() {
  return (
    <main>
      <CinematicHero
        image="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=82"
        alt="JK Hospital reception"
        minHeight="min-h-[48vh]"
        eyebrow={<span className="live-badge mb-4">We are here for you</span>}
        title={<h1 className="text-5xl font-bold">JK Hospital reception</h1>}
        subtitle={<p className="mt-4 text-lg text-slate-600">Emergency and appointment support is one call away.</p>}
      />
      <section className="container-pad -mt-12 grid gap-8 pb-16 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="glass rounded-lg p-8">
          <div className="space-y-4 text-slate-600">
            <p className="flex items-center gap-3"><Phone className="text-medical-600" /> Emergency and reception: 7845265507</p>
            <p className="flex items-center gap-3"><Mail className="text-medical-600" /> care@jkhospital.local</p>
            <p className="flex items-center gap-3"><MapPin className="text-medical-600" /> JK Hospital, Tamil Nadu</p>
          </div>
          <motion.a
            href="tel:7845265507"
            className="btn-primary mt-8 inline-flex"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Call reception now
          </motion.a>
        </Reveal>
        <Reveal delay={0.06} className="overflow-hidden rounded-lg shadow-soft">
          <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=82" alt="JK Hospital contact desk" className="h-full min-h-[420px] w-full object-cover" />
        </Reveal>
      </section>
    </main>
  );
}
