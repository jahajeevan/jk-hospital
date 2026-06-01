import { Mail, MapPin, Phone } from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer border-t border-slate-200 bg-white/90 py-10 text-slate-700 shadow-[0_-18px_50px_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="container-pad grid gap-7 md:grid-cols-[1.1fr_1fr_0.9fr] md:items-start">
        <div>
          <BrandLogo markSize="md" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">Modern appointment and token care for families, with live OP availability and verified online payments.</p>
        </div>
        <div className="space-y-3 text-sm text-slate-500">
          <p className="footer-contact-row"><Phone size={16} /> <span><strong>Emergency</strong> 7845265507</span></p>
          <p className="footer-contact-row"><Mail size={16} /> <span>care@jkhospital.local</span></p>
          <p className="footer-contact-row"><MapPin size={16} /> <span>Main Road, Tamil Nadu</span></p>
        </div>
        <div className="rounded-xl border border-medical-100 bg-medical-50/70 p-4 text-sm leading-relaxed text-slate-600">Online payments: UPI, wallets, netbanking, and cards through Razorpay when enabled.</div>
      </div>
    </footer>
  );
}
