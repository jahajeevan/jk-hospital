import { Ambulance, ArrowRight, Baby, Bone, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import CinematicHero from '../components/CinematicHero.jsx';
import Reveal from '../components/Reveal.jsx';

const services = [
  [HeartPulse, 'General OP', 'Primary care, fever care, screening, and long-term follow-up.', 'from-sky-500 to-blue-600'],
  [Baby, 'Pediatrics', 'Child wellness, immunization guidance, and urgent pediatric support.', 'from-emerald-500 to-teal-600'],
  [Bone, 'Orthopedics', 'Joint pain, injuries, fracture follow-up, and mobility care.', 'from-violet-500 to-indigo-600'],
  [FileText, 'Digital invoices', 'Downloadable invoices with patient, doctor, token, and payment details.', 'from-amber-500 to-orange-600'],
  [ShieldCheck, 'Verified tokens', 'Online payment verification before token generation.', 'from-cyan-500 to-sky-600'],
  [Ambulance, 'Emergency desk', 'Fast help through JK Hospital reception at 7845265507.', 'from-rose-500 to-pink-600']
];

export default function Services() {
  return (
    <main>
      <CinematicHero
        image="https://images.unsplash.com/photo-1579684385127-1ef15d508a1c?auto=format&fit=crop&w=1800&q=82"
        alt="Hospital services"
        minHeight="min-h-[52vh]"
        eyebrow={<span className="live-badge mb-4">Patient-first services</span>}
        title={<h1 className="text-3xl font-bold sm:text-5xl">Care workflows built around time</h1>}
        subtitle={<p className="mt-4 max-w-2xl text-lg text-slate-600">Every service is designed to reduce waiting-room confusion and keep families informed.</p>}
      />

      <section className="container-pad section-pro -mt-12">
        <Reveal className="max-w-2xl">
          <p className="section-kicker">What we offer</p>
          <h2 className="section-title-pro mt-3">Departments &amp; digital care</h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map(([Icon, title, copy, tone], index) => (
            <Reveal key={title} delay={index * 0.05} className="bento-card group h-full">
              <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-e2`}>
                <Icon size={26} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
            </Reveal>
          ))}
        </div>

        {/* Closing CTA band */}
        <Reveal className="landing-cta mt-14" calm>
          <div className="landing-cta-glow" aria-hidden />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white md:text-4xl">Need care today?</h2>
              <p className="mt-3 max-w-xl text-lg text-white/90">
                Book a token online, pay securely, and walk in with your queue position ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <Link to="/book" className="btn-cta-white">
                Book a token <ArrowRight size={18} />
              </Link>
              <a href="tel:7845265507" className="btn-cta-outline">
                Call emergency desk
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
