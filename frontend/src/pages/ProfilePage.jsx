import { UserProfile } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  return (
    <main className="patient-wow-page min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="patient-hero-panel mb-6">
          <p className="flex items-center gap-2 font-semibold text-medical-600">
            <ShieldCheck size={17} /> Secure account
          </p>
          <h1 className="mt-2 text-4xl font-bold text-ink">Profile settings</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Manage your JK Hospital identity, email verification, password, Google login, and active sessions.
          </p>
        </motion.div>
        <section className="patient-panel rounded-2xl p-4">
          <UserProfile
            routing="path"
            path="/profile"
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'w-full shadow-none',
                card: 'w-full border-0 bg-transparent shadow-none',
                navbar: 'rounded-xl bg-white/70',
                pageScrollBox: 'rounded-xl bg-white/80',
                formButtonPrimary: 'bg-medical-600 hover:bg-medical-700'
              },
              variables: {
                colorPrimary: '#147bd1',
                colorText: '#102033',
                borderRadius: '0.75rem'
              }
            }}
          />
        </section>
      </div>
    </main>
  );
}
