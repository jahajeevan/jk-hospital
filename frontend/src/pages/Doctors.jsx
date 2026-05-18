import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import CinematicHero from '../components/CinematicHero.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import Reveal from '../components/Reveal.jsx';
import { getLocalDoctors } from '../utils/localStore.js';

export default function Doctors() {
  const doctors = getLocalDoctors();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');

  const specialties = useMemo(() => ['all', ...new Set(doctors.map((d) => d.specialty))], [doctors]);

  const filtered = useMemo(
    () =>
      doctors.filter((doctor) => {
        const matchesQuery =
          !query ||
          doctor.name.toLowerCase().includes(query.toLowerCase()) ||
          doctor.specialty.toLowerCase().includes(query.toLowerCase());
        const matchesSpecialty = specialty === 'all' || doctor.specialty === specialty;
        return matchesQuery && matchesSpecialty;
      }),
    [doctors, query, specialty]
  );

  return (
    <main>
      <CinematicHero
        image="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1800&q=82"
        alt="JK Hospital doctors"
        minHeight="min-h-[48vh]"
        eyebrow={<span className="live-badge mb-4">Live schedules</span>}
        title={<h1 className="text-5xl font-bold">Meet our specialists</h1>}
        subtitle={
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Compare live token availability, consultation fees, and OP timings before you book.
          </p>
        }
      />
      <section className="container-pad -mt-12 pb-16">
        <Reveal className="glass rounded-xl p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="field pl-10" placeholder="Search doctor or specialty..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              {specialties.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSpecialty(item)}
                  className={`tab-pill ${specialty === item ? 'tab-pill-active' : 'bg-white ring-1 ring-slate-200'}`}
                >
                  {item === 'all' ? 'All' : item}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">{filtered.length} doctor{filtered.length === 1 ? '' : 's'} available</p>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor, index) => (
            <DoctorCard key={doctor._id} doctor={doctor} index={index} />
          ))}
        </div>
        {!filtered.length && (
          <div className="glass mt-8 rounded-xl p-10 text-center">
            <p className="text-lg font-bold text-slate-700">No doctors match your search</p>
            <p className="mt-2 text-sm text-slate-500">Try another specialty or clear the search box.</p>
          </div>
        )}
      </section>
    </main>
  );
}
