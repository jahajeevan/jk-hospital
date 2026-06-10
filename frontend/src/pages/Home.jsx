import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ChevronRight,
  Clock3,
  CreditCard,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Ticket,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard.jsx';
import TiltCard from '../components/TiltCard.jsx';
import { galleryImages, testimonials } from '../data/demoData.js';
import { fetchDoctors, getCachedDoctors } from '../services/apiService.js';
import { fadeUp, staggerContainer } from '../utils/motion.js';

const steps = [
  {
    icon: Stethoscope,
    title: 'Pick doctor & slot',
    copy: 'See live token counts and OP timings before you reserve your visit.',
    tone: 'from-sky-500 to-blue-600'
  },
  {
    icon: CreditCard,
    title: 'Pay securely online',
    copy: 'Razorpay UPI, cards, wallets, and netbanking — fee details in your dashboard.',
    tone: 'from-emerald-500 to-teal-600'
  },
  {
    icon: Ticket,
    title: 'Get your token',
    copy: 'Instant token number, queue estimate, and branded PDF invoice.',
    tone: 'from-violet-500 to-indigo-600'
  }
];

const faqs = [
  {
    q: 'Do I need to upload payment proof?',
    a: 'No. Razorpay verifies your payment automatically. Your token is confirmed as soon as payment succeeds.'
  },
  {
    q: 'Can I cancel my appointment?',
    a: 'Yes — open your patient dashboard, cancel the visit, and submit a refund request if needed.'
  },
  {
    q: 'How early should I arrive?',
    a: 'Arrive 15 minutes before your slot with your token number or downloaded invoice ready.'
  },
  {
    q: 'Where do I see the consultation fee?',
    a: 'After you choose a doctor and slot, the fee appears in your booking flow and patient dashboard before you pay.'
  }
];

export default function Home() {
  const [doctors, setDoctors] = useState(() => getCachedDoctors().slice(0, 3));
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(!doctors.length);
        const data = await fetchDoctors();
        const doctorList = Array.isArray(data) ? data.slice(0, 3) : [];
        setDoctors(doctorList);
      } catch (error) {
        console.error('Error loading doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    loadDoctors();
  }, [doctors.length]);

  return (
    <main className="landing-page">
      {/* ——— HERO ——— */}
      <section className="landing-hero">
        <motion.div
          className="landing-hero-bg"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=85"
            alt="JK Hospital modern care"
            className="h-full w-full object-cover"
          />
        </motion.div>
        <motion.div className="landing-hero-mesh" aria-hidden="true" />
        <motion.div className="landing-hero-shell container-pad relative z-10 flex min-h-[88vh] items-center py-16 lg:py-24">
          <motion.div
            className="hero-copy mx-auto max-w-4xl text-center lg:mx-0 lg:text-left"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="landing-pill mx-auto lg:mx-0">
              <span className="landing-pill-dot" />
              Tamil Nadu · Live OP tokens · Emergency 7845265507
            </motion.div>
            <motion.h1 variants={fadeUp} className="landing-display mt-6 text-white">
              Hospital visits,
              <span className="landing-gradient-text"> without the chaos.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85 lg:mx-0">
              Book your token in minutes. Pay online. Track your queue. Download a professional invoice — all from one beautiful patient dashboard.
            </motion.p>
            <motion.div variants={fadeUp} className="hero-actions mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-start justify-center">
              <Link to="/book" className="btn-primary btn-lg btn-glow">
                Book a token <CalendarCheck size={18} />
              </Link>
              <Link to="/signup" className="btn-ghost-light btn-lg">
                Get started free <ArrowRight size={18} />
              </Link>
              <Link to="/ai" className="btn-ghost-light btn-lg">
                Ask local AI <Bot size={18} />
              </Link>
              <a href="tel:7845265507" className="btn-ghost-light btn-lg sm:hidden">
                <Phone size={18} /> Emergency
              </a>
            </motion.div>
            <motion.div variants={fadeUp} className="hero-stats mt-10 flex flex-wrap gap-8 text-sm text-white/75 lg:justify-start justify-center">
              {[
                ['42k+', 'Patients served'],
                ['98%', 'Wait clarity'],
                ['< 2 min', 'To book a token']
              ].map(([val, label]) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white">{val}</p>
                  <p>{label}</p>
                </div>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="hero-chips mt-8 flex flex-wrap gap-2 lg:justify-start justify-center">
              {['Secure payments', 'Live tokens', 'Digital invoices'].map((chip) => (
                <span key={chip} className="hero-chip">
                  <ShieldCheck size={14} /> {chip}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ——— TRUST STRIP ——— */}
      <section className="border-y border-slate-200/80 bg-white py-5">
        <motion.div
          className="trust-strip container-pad flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold text-slate-600"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {['Local Gemma AI assistant', 'Razorpay verified payments', 'Encrypted patient records', 'PDF invoices', 'Refund requests'].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" /> {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ——— GALLERY MARQUEE ——— */}
      <section className="gallery-strip overflow-hidden bg-slate-950 py-6">
        <div className="video-strip-track opacity-90">
          {[...galleryImages, ...galleryImages].map((image, index) => (
            <img key={`${image}-${index}`} src={image} alt="" className="h-32 w-52 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
          ))}
        </div>
      </section>

      {/* ——— HOW IT WORKS (BENTO) ——— */}
      <section className="section-pro">
        <div className="container-pad">
          <motion.div className="max-w-2xl" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <p className="section-kicker">How it works</p>
            <h2 className="section-title-pro mt-3">Three steps. Zero confusion.</h2>
            <p className="mt-4 text-lg text-slate-600">Designed like a modern product — not a paper form at the reception desk.</p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, copy, tone }, index) => (
              <TiltCard key={title} className="bento-card group h-full">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
                  <Icon size={22} />
                </span>
                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-medical-600">Step {index + 1}</p>
                <h3 className="mt-2 text-xl font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-medical-600 opacity-0 transition group-hover:opacity-100">
                  Learn more <ChevronRight size={14} />
                </span>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ——— DOCTORS ——— */}
      <section className="section-pro hospital-bg">
        <motion.div className="container-pad">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="section-kicker">Specialists</p>
              <h2 className="section-title-pro mt-3">Meet our doctors</h2>
            </div>
            <Link to="/doctors" className="btn-secondary">
              Browse all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {doctors.map((doctor, index) => (
              <DoctorCard key={doctor._id} doctor={doctor} index={index} compact />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ——— FEATURES BENTO ——— */}
      <section className="section-pro bg-white">
        <div className="container-pad">
          <div className="grid gap-5 lg:grid-cols-12">
            <motion.div
              className="bento-card lg:col-span-7"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Sparkles className="text-medical-600" size={24} />
              <h3 className="mt-4 text-2xl font-bold text-ink">Built for families who hate waiting blind</h3>
              <ul className="mt-6 space-y-4">
                {[
                  [CalendarCheck, 'See exactly how many tokens are left before you book'],
                  [Clock3, 'Queue estimates update with every new booking'],
                  [ShieldCheck, 'Payments verified before your token is issued']
                ].map(([Icon, text]) => (
                  <li key={text} className="flex gap-3 text-slate-600">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-600">
                      <Icon size={18} />
                    </span>
                    <span className="pt-2 text-sm leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="bento-card lg:col-span-5"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={0.1}
              variants={fadeUp}
            >
              <Users className="text-emerald-600" size={24} />
              <h3 className="mt-4 text-xl font-bold text-ink">Patient voices</h3>
              <div className="mt-5 space-y-4">
                {testimonials.map(([copy, name]) => (
                  <blockquote key={name} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
                    &ldquo;{copy}&rdquo;
                    <footer className="mt-3 font-bold text-medical-600">— {name}</footer>
                  </blockquote>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ——— FAQ ——— */}
      <section className="section-pro">
        <div className="container-pad max-w-3xl">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <p className="section-kicker">FAQ</p>
            <h2 className="section-title-pro mt-3">Common questions</h2>
          </motion.div>
          <div className="mt-8 space-y-3">
            {faqs.map((item, index) => {
              const open = openFaq === index;
              return (
                <motion.button
                  key={item.q}
                  type="button"
                  className={`faq-accordion w-full text-left ${open ? 'faq-accordion-open' : ''}`}
                  onClick={() => setOpenFaq(open ? -1 : index)}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={index * 0.05}
                  variants={fadeUp}
                >
                  <span className="flex items-center justify-between gap-4">
                    <span className="font-bold text-ink">{item.q}</span>
                    <ChevronRight size={18} className={`shrink-0 text-medical-600 transition ${open ? 'rotate-90' : ''}`} />
                  </span>
                  {open && <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ——— CTA ——— */}
      <section className="container-pad pb-24 pt-4">
        <motion.div
          className="landing-cta"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <motion.div className="landing-cta-glow" aria-hidden />
          <motion.div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white md:text-4xl">Ready for your visit?</h2>
              <p className="mt-3 max-w-xl text-lg text-white/90">
                Create your account, book a slot, pay online, and walk in with your token ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <Link to="/signup" className="btn-cta-white">
                Create free account <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-cta-outline">
                I already have an account
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
