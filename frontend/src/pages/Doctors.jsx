import { Award, CalendarCheck, Search, Sparkles, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard.jsx';
import Reveal from '../components/Reveal.jsx';
import { fetchDoctors, getCachedDoctors } from '../services/apiService.js';

export default function Doctors() {
  const [doctors, setDoctors] = useState(() => getCachedDoctors());
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(!doctors.length);
        const data = await fetchDoctors();
        setDoctors(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading doctors:', error);
        toast.error('Failed to load doctors');
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    loadDoctors();
  }, [doctors.length]);

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
    <main className="doctors-wow-page">
      <section className="doctors-hero">
        <div className="container-pad">
          <span className="live-badge">Live specialist schedules</span>
          <h1>Meet the doctors behind JK Hospital</h1>
          <p>Compare live token availability, consultation fees, OP timings, and specialities before booking.</p>
          <div className="doctors-hero-stats">
            <span><UsersRound size={18} /> {doctors.length} specialists</span>
            <span><CalendarCheck size={18} /> Live OP tokens</span>
            <span><Award size={18} /> Trusted care</span>
          </div>
        </div>
      </section>
      <section className="container-pad doctors-content">
        <Reveal className="doctor-filter-panel">
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
