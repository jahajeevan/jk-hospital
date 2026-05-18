import { Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/90 py-10 text-slate-700 shadow-[0_-18px_50px_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="container-pad grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-bold text-ink">JK Hospital</h3>
          <p className="mt-2 text-sm text-slate-500">Modern appointment and token care for families.</p>
        </div>
        <div className="space-y-2 text-sm text-slate-500">
          <p className="flex items-center gap-2"><Phone size={16} /> Emergency: 7845265507</p>
          <p className="flex items-center gap-2"><Mail size={16} /> care@jkhospital.local</p>
          <p className="flex items-center gap-2"><MapPin size={16} /> Main Road, Tamil Nadu</p>
        </div>
        <div className="text-sm text-slate-500">Online payments: UPI, wallets, netbanking, and cards through Razorpay when enabled.</div>
      </div>
    </footer>
  );
}
