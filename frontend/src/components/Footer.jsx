import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';

const quickLinks = [
  ['Book a token', '/book'],
  ['Our doctors', '/doctors'],
  ['Services', '/services'],
  ['Contact', '/contact']
];

export default function Footer() {
  return (
    <footer className="site-footer relative border-t border-slate-200 bg-white/90 py-11 text-slate-700 shadow-[0_-18px_50px_rgba(15,23,42,0.03)] backdrop-blur">
      {/* brand gradient hairline */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-medical-600 via-medical-400 to-mint" aria-hidden />
      <div className="container-pad grid gap-8 md:grid-cols-[1.2fr_0.8fr_1fr_1fr] md:items-start">
        <div>
          <BrandLogo markSize="md" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">Modern appointment and token care for families, with live OP availability and verified online payments.</p>
        </div>

        <nav className="text-sm" aria-label="Footer">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-medical-600">Quick links</p>
          <ul className="space-y-2">
            {quickLinks.map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="text-slate-500 transition hover:text-medical-600">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 text-sm text-slate-500">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-medical-600">Reach us</p>
          <p className="footer-contact-row"><Phone size={16} /> <span><strong>Emergency</strong> 7845265507</span></p>
          <p className="footer-contact-row"><Mail size={16} /> <span>care@jkhospital.local</span></p>
          <p className="footer-contact-row"><MapPin size={16} /> <span>Main Road, Tamil Nadu</span></p>
        </div>

        <div className="rounded-2xl border border-medical-100 bg-gradient-to-br from-medical-50/80 to-emerald-50/70 p-4 text-sm leading-relaxed text-slate-600 shadow-e1">
          <p className="font-bold text-ink">Secure online payments</p>
          <p className="mt-1">UPI, wallets, netbanking, and cards through Razorpay when enabled.</p>
        </div>
      </div>
      <div className="container-pad mt-8 border-t border-slate-100 pt-5 text-xs text-slate-400">
        © {2026} JK Hospital · Tamil Nadu · Live OP tokens &amp; verified payments
      </div>
    </footer>
  );
}
