import { Ambulance, Baby, Bone, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import CinematicHero from '../components/CinematicHero.jsx';
import Reveal from '../components/Reveal.jsx';

const services = [
  [HeartPulse, 'General OP', 'Primary care, fever care, screening, and long-term follow-up.'],
  [Baby, 'Pediatrics', 'Child wellness, immunization guidance, and urgent pediatric support.'],
  [Bone, 'Orthopedics', 'Joint pain, injuries, fracture follow-up, and mobility care.'],
  [FileText, 'Digital invoices', 'Downloadable invoices with patient, doctor, token, and payment details.'],
  [ShieldCheck, 'Verified tokens', 'Online payment verification before token generation.'],
  [Ambulance, 'Emergency desk', 'Fast help through JK Hospital reception at 7845265507.']
];

export default function Services() {
  return (
    <main>
      <CinematicHero
        image="https://images.unsplash.com/photo-1579684385127-1ef15d508a1c?auto=format&fit=crop&w=1800&q=82"
        alt="Hospital services"
        minHeight="min-h-[48vh]"
        eyebrow={<span className="live-badge mb-4">Patient-first services</span>}
        title={<h1 className="text-3xl font-bold sm:text-5xl">Care workflows built around time</h1>}
        subtitle={<p className="mt-4 max-w-2xl text-lg text-slate-600">Every service is designed to reduce waiting-room confusion and keep families informed.</p>}
      />
      <section className="container-pad -mt-12 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {services.map(([Icon, title, copy], index) => (
            <Reveal key={title} delay={index * 0.05} className="glass premium-card rounded-lg p-6">
              <Icon className="text-medical-600" />
              <h2 className="mt-4 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
