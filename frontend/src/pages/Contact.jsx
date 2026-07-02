import { Ambulance, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import CinematicHero from '../components/CinematicHero.jsx';
import Reveal from '../components/Reveal.jsx';

const channels = [
  [Phone, 'Emergency & reception', '7845265507', 'tel:7845265507', 'from-rose-500 to-pink-600'],
  [Mail, 'Email us', 'care@jkhospital.local', 'mailto:care@jkhospital.local', 'from-sky-500 to-blue-600'],
  [MapPin, 'Visit us', 'JK Hospital, Tamil Nadu', null, 'from-emerald-500 to-teal-600'],
  [Clock, 'OP hours', 'Mon–Sat · 8am – 9pm', null, 'from-violet-500 to-indigo-600']
];

export default function Contact() {
  return (
    <main>
      <CinematicHero
        image="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=82"
        alt="JK Hospital reception"
        minHeight="min-h-[50vh]"
        eyebrow={<span className="live-badge mb-4">We are here for you</span>}
        title={<h1 className="text-3xl font-bold sm:text-5xl">Get in touch with JK Hospital</h1>}
        subtitle={<p className="mt-4 text-lg text-slate-600">Emergency and appointment support is one call away — around the clock.</p>}
      />

      <section className="container-pad section-pro -mt-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          {/* Channels */}
          <div>
            <Reveal>
              <p className="section-kicker">Reach us</p>
              <h2 className="section-title-pro mt-3">Ways to connect</h2>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {channels.map(([Icon, label, value, href, tone], index) => {
                const inner = (
                  <>
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-e2`}>
                      <Icon size={22} />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider text-medical-600">{label}</p>
                    <p className="text-wrap-anywhere mt-1 text-lg font-bold text-ink">{value}</p>
                  </>
                );
                return (
                  <Reveal key={label} delay={index * 0.05} className="h-full" calm>
                    {href ? (
                      <a href={href} className="bento-card group block h-full transition hover:-translate-y-1">{inner}</a>
                    ) : (
                      <div className="bento-card h-full">{inner}</div>
                    )}
                  </Reveal>
                );
              })}
            </div>

            <Reveal calm className="mt-6">
              <div className="glass flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-e2">
                    <Ambulance size={20} />
                  </span>
                  <div>
                    <p className="font-bold text-ink">Medical emergency?</p>
                    <p className="text-sm text-slate-600">Our reception line is staffed 24/7.</p>
                  </div>
                </div>
                <motion.a
                  href="tel:7845265507"
                  className="btn-primary shrink-0"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone size={18} /> Call reception now
                </motion.a>
              </div>
            </Reveal>
          </div>

          {/* Visual */}
          <Reveal delay={0.08} className="relative overflow-hidden rounded-3xl shadow-e4">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=82"
              alt="JK Hospital contact desk"
              className="h-full min-h-[460px] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-lg font-bold">JK Hospital, Tamil Nadu</p>
              <p className="text-sm text-white/80">Trusted OP care with live tokens and verified online payments.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
