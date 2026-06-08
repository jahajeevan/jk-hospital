import { motion } from 'framer-motion';
import { CalendarPlus, Eye, Image, LockKeyhole, MailCheck, Plus, ShieldCheck, Stethoscope, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import MetricCard from '../components/MetricCard.jsx';
import Modal from '../components/ui/Modal.jsx';
import { closeAdminSession, isAdminSessionOpen, openAdminSession, verifyAdminCredential } from '../utils/adminAuth.js';
import { DEPARTMENTS } from '../utils/localStore.js';
import { fetchAppointments, fetchDoctors, fetchRefundRequests, updateRefundRequest, updateDoctor, updateDoctorSlot, createDoctor as createDoctorApi, updateAppointment, deleteDoctor as deleteDoctorApi, deleteSlot as deleteSlotApi } from '../services/apiService.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { MIN_CONSULTATION_FEE, normalizeFee } from '../utils/paymentRules.js';
import { isNonNegativeInteger, isPositiveInteger, isTimeBefore, isValidHttpUrl } from '../utils/validation.js';

const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const palette = ['#147bd1', '#10b981', '#f59e0b', '#e05283'];
const defaultDoctorForm = { 
  name: '', 
  specialty: '', 
  specialization: '', 
  qualification: '', 
  department: 'General Medicine', 
  experience: '', 
  avatar: '', 
  fee: 500, 
  bio: '', 
  isAvailable: true,
  email: '',
  password: '',
  confirmPassword: ''
};
const defaultSlotForm = {
  doctorId: '',
  label: '',
  date: '',
  availableFrom: '',
  availableUntil: '',
  startTime: '',
  endTime: '',
  tokenLimit: '',
  walkInTokenLimit: 50,
  fee: 500,
  advanceBookingMinutes: 60,
  isActive: true
};

const activeRevenueStatuses = new Set(['approved', 'confirmed', 'completed']);

const bookingPatientEmail = (booking) =>
  booking.patientEmail || booking.patientDetails?.email || booking.patient?.email || '';

const bookingPaymentAmount = (booking) => {
  const payment = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment;
  return Number(payment?.amount || 0);
};

const bookingPayment = (booking) => (Array.isArray(booking.payment) ? booking.payment[0] : booking.payment);

const isOnlineVerifiedPayment = (booking) => {
  const payment = bookingPayment(booking);
  if (!payment) return true;
  return payment.method !== 'walk-in';
};

const buildOverviewFromBookings = (items, refunds = []) => {
  const consultationRevenue = items
    .filter((item) => activeRevenueStatuses.has(item.status))
    .reduce((sum, item) => sum + bookingPaymentAmount(item), 0);

  const pharmacyRevenue = items
    .filter((item) => item.status === 'completed' && item.pharmacyBill)
    .reduce((sum, item) => sum + Number(item.pharmacyBill.totalAmount || 0), 0);

  const revenue = consultationRevenue + pharmacyRevenue;

  return {
    stats: {
      appointments: items.length,
      patients: new Set(items.map(bookingPatientEmail).filter(Boolean)).size,
      pendingRefunds: refunds.filter((item) => item.status === 'pending').length,
      revenue,
      consultationRevenue,
      pharmacyRevenue
    }
  };
};

export default function AdminDashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  
  const [unlocked, setUnlocked] = useState(() => isAdminSessionOpen());
  const [password, setPassword] = useState('');
  const [selectedProof, setSelectedProof] = useState(null);
  const [overview, setOverview] = useState({ stats: { appointments: 0, patients: 0, pendingRefunds: 0, revenue: 0 } });
  const [bookings, setBookings] = useState([]);
  const [doctorList, setDoctorList] = useState([]);
  const [adminTab, setAdminTab] = useState('overview');
  const [bookingQuery, setBookingQuery] = useState('');
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorFormOpen, setDoctorFormOpen] = useState(false);
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState(defaultDoctorForm);
  const [slotForm, setSlotForm] = useState(defaultSlotForm);

  useEffect(() => {
    let cancelled = false;

    const loadServer = async () => {
      try {
        setLoading(true);
        const [appointmentsData, doctorsData, refundsData] = await Promise.all([
          fetchAppointments(),
          fetchDoctors(),
          fetchRefundRequests()
        ]);
        if (cancelled) return;
        setBookings(Array.isArray(appointmentsData) ? appointmentsData : []);
        setDoctorList(Array.isArray(doctorsData) ? doctorsData : []);
        setRefunds(Array.isArray(refundsData) ? refundsData : []);
        
        const stats = buildOverviewFromBookings(
          Array.isArray(appointmentsData) ? appointmentsData : [],
          Array.isArray(refundsData) ? refundsData : []
        );
        setOverview(stats);
      } catch (error) {
        console.error('Error loading admin data:', error);
        toast.error('Could not load live admin data');
        setBookings([]);
        setDoctorList([]);
        setRefunds([]);
      } finally {
        setLoading(false);
      }
    };

    void loadServer();
    return () => {
      cancelled = true;
    };
  }, []);

  const occupancy = useMemo(
    () => {
      const counts = new Map();
      bookings
        .filter((booking) => !['cancelled', 'rejected', 'declined'].includes(booking.status))
        .forEach((booking) => {
          const name = booking.doctor?.name || 'Unknown';
          counts.set(name, (counts.get(name) || 0) + 1);
        });
      if (counts.size) {
        return Array.from(counts, ([name, tokens]) => ({ name: name.replace('Dr. ', ''), tokens }));
      }
      return doctorList.map((doctor) => ({ name: doctor.name.replace('Dr. ', ''), tokens: doctor.slots.reduce((sum, slot) => sum + (slot.bookedTokens || 0), 0) }));
    },
    [bookings, doctorList]
  );

  const dailyBookings = useMemo(() => {
    const base = weekLabels.map((name) => ({ name, bookings: 0 }));
    bookings.forEach((booking) => {
      const day = new Date(booking.createdAt || Date.now()).getDay();
      base[day].bookings += 1;
    });
    return base;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = bookingQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((booking) =>
      [booking.patientDetails?.name, booking.patientName, booking.patientEmail, booking.doctor?.name, booking.slotLabel, booking.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [bookings, bookingQuery]);

  const statusBreakdown = useMemo(() => {
    const counts = { payment_submitted: 0, approved: 0, confirmed: 0, declined: 0, rejected: 0, cancelled: 0 };
    bookings.forEach((booking) => {
      counts[booking.status] = (counts[booking.status] || 0) + 1;
    });
    return [
      { name: 'Pending', value: counts.payment_submitted },
      { name: 'Accepted', value: counts.approved + counts.confirmed },
      { name: 'Declined', value: counts.declined + counts.rejected },
      { name: 'Cancelled', value: counts.cancelled }
    ];
  }, [bookings]);

  const markLeave = async (doctor) => {
    const nextDoctor = { ...doctor, isAvailable: false };
    try {
      const updated = await updateDoctor(doctor._id, nextDoctor);
      setDoctorList(prev => prev.map(d => d._id === doctor._id ? updated : d));
      toast.success('Doctor leave mode enabled and patients notified');
    } catch (error) {
      console.error('Error marking leave:', error);
      toast.error(error.response?.data?.message || 'Could not mark doctor leave');
    }
  };

  const login = async (event) => {
    event.preventDefault();
    try {
      const valid = await verifyAdminCredential(password);
      if (!valid) {
        toast.error('Wrong admin password');
        return;
      }
      openAdminSession();
      setUnlocked(true);
      setPassword('');
      toast.success('Admin dashboard unlocked');
    } catch (error) {
      toast.error(error.message || 'Could not unlock admin panel');
    }
  };

  const persistDoctor = async (doctor) => {
    try {
      const updated = await updateDoctor(doctor._id, doctor);
      setDoctorList(prev => prev.map(d => d._id === doctor._id ? updated : d));
      toast.success('Doctor updated');
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast.error('Failed to update doctor');
      throw error;
    }
  };

  const updateDoctor = async (doctorId, field, value) => {
    const nextDoctors = doctorList.map((doctor) =>
      doctor._id === doctorId
        ? {
            ...doctor,
            [field]: field === 'fee' ? normalizeFee(value) : value
          }
        : doctor
    );
    setDoctorList(nextDoctors);
    await persistDoctor(nextDoctors.find((doctor) => doctor._id === doctorId));
  };

  const updateSlot = async (doctorId, slotId, field, value) => {
    const doctor = doctorList.find((item) => item._id === doctorId);
    const current = doctor?.slots.find((slot) => slot._id === slotId);
    if (!doctor || !current) return;
    const numericFields = ['fee', 'tokenLimit', 'bookedTokens', 'walkInTokenLimit', 'walkInBookedTokens', 'advanceBookingMinutes'];
    const nextValue = numericFields.includes(field) ? Math.max(Number(value), 0) : value;
    const nextSlot = {
      ...current,
      [field]: field === 'fee' ? normalizeFee(nextValue, doctor.fee) : nextValue
    };
    if (field === 'tokenLimit') {
      nextSlot.bookedTokens = Math.min(nextSlot.bookedTokens || 0, nextSlot.tokenLimit);
    }
    if (field === 'walkInTokenLimit') {
      nextSlot.walkInBookedTokens = Math.min(nextSlot.walkInBookedTokens || 0, nextSlot.walkInTokenLimit);
    }
    
    // Update in UI immediately for responsiveness
    const nextDoctor = {
      ...doctor,
      slots: doctor.slots.map(s => s._id === slotId ? nextSlot : s)
    };
    setDoctorList(prev => prev.map(d => d._id === doctorId ? nextDoctor : d));
    
    // Update on server
    try {
      await updateDoctorSlot(doctorId, slotId, nextSlot);
    } catch (error) {
      console.error('Error updating slot:', error);
      toast.error('Failed to update slot');
      // Reload to sync with server
      const freshDoctors = await fetchDoctors();
      setDoctorList(freshDoctors);
    }
  };

  const updateRemaining = (doctorId, slotId, value) => {
    const doctor = doctorList.find((item) => item._id === doctorId);
    const slot = doctor?.slots.find((item) => item._id === slotId);
    if (!slot) return;
    const remaining = Math.max(Number(value), 0);
    updateSlot(doctorId, slotId, 'bookedTokens', Math.max((slot.tokenLimit || 0) - remaining, 0));
  };

  const handleDeleteDoctor = async (doctor) => {
    if (!confirm(`Delete Dr. ${doctor.name}? This will also delete all their slots and associated data.`)) {
      return;
    }
    try {
      await deleteDoctorApi(doctor._id);
      setDoctorList(prev => prev.filter(d => d._id !== doctor._id));
      toast.success(`Dr. ${doctor.name} deleted successfully`);
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error(error.response?.data?.message || 'Failed to delete doctor');
    }
  };

  const handleDeleteSlot = async (doctorId, slotId, slotLabel) => {
    if (!confirm(`Delete slot "${slotLabel}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteSlotApi(slotId);
      const doctor = doctorList.find(d => d._id === doctorId);
      if (doctor) {
        const nextDoctor = {
          ...doctor,
          slots: doctor.slots.filter(s => s._id !== slotId)
        };
        setDoctorList(prev => prev.map(d => d._id === doctorId ? nextDoctor : d));
        toast.success('Slot deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    }
  };

  const openDoctorForm = () => {
    setDoctorForm(defaultDoctorForm);
    setDoctorFormOpen(true);
  };

  const validateDoctorForm = () => {
    if (!doctorForm.name.trim()) return 'Doctor name is required';
    if (!doctorForm.specialty.trim()) return 'Specialty is required';
    if (!doctorForm.qualification.trim()) return 'Qualification is required';
    if (!doctorForm.experience.trim()) return 'Experience is required';
    if (!isValidHttpUrl(doctorForm.avatar)) return 'Enter a valid doctor image URL';
    if (normalizeFee(doctorForm.fee) < MIN_CONSULTATION_FEE) return `Fee must be at least INR ${MIN_CONSULTATION_FEE}`;
    if (doctorForm.bio.trim().length < 12) return 'Profile must be at least 12 characters';
    
    // Email validation
    if (!doctorForm.email.trim()) return 'Hospital email is required';
    if (!doctorForm.email.includes('@jkhospital.com')) return 'Email must be in format: name@jkhospital.com';
    
    // Password validation
    if (!doctorForm.password) return 'Password is required';
    if (doctorForm.password.length < 8) return 'Password must be at least 8 characters';
    if (doctorForm.password !== doctorForm.confirmPassword) return 'Passwords do not match';
    
    return '';
  };

  const createDoctor = async (event) => {
    event.preventDefault();
    const error = validateDoctorForm();
    if (error) return toast.error(error);
    
    try {
      const doctor = await createDoctorApi({
        name: doctorForm.name.trim(),
        specialty: doctorForm.specialty.trim(),
        specialization: (doctorForm.specialization || doctorForm.specialty).trim(),
        qualification: doctorForm.qualification.trim(),
        department: doctorForm.department,
        experience: doctorForm.experience.trim(),
        avatar: doctorForm.avatar.trim(),
        bio: doctorForm.bio.trim(),
        fee: normalizeFee(doctorForm.fee),
        isAvailable: doctorForm.isAvailable,
        email: doctorForm.email.trim().toLowerCase(),
        password: doctorForm.password,
        slots: []
      });
      
      // Refresh doctors list
      const freshDoctors = await fetchDoctors();
      setDoctorList(Array.isArray(freshDoctors) ? freshDoctors : []);
      
      setDoctorFormOpen(false);
      setDoctorForm(defaultDoctorForm);
      toast.success(`Dr. ${doctor.name} added successfully. Login credentials: ${doctor.email} / [password]`);
    } catch (error) {
      console.error('Error creating doctor:', error);
      toast.error(error.response?.data?.message || 'Failed to add doctor');
    }
  };
      setDoctorForm(defaultDoctorForm);
      toast.success(`${doctor.name} added`);
    } catch (error) {
      console.error('Error creating doctor:', error);
      toast.error('Failed to add doctor');
    }
  };

  const openSlotForm = (doctorId, date = '') => {
    const doctor = doctorList.find((item) => item._id === doctorId);
    setSlotForm({
      ...defaultSlotForm,
      doctorId,
      date,
      fee: doctor?.fee || 500
    });
    setSlotFormOpen(true);
  };

  const validateSlotForm = () => {
    if (!slotForm.doctorId) return 'Select a doctor before adding a slot';
    if (!slotForm.label.trim()) return 'Slot name is required';
    if (!slotForm.startTime || !slotForm.endTime) return 'Start and end time are required';
    if (!isTimeBefore(slotForm.startTime, slotForm.endTime)) return 'Slot end time must be after start time';
    if (!isPositiveInteger(slotForm.tokenLimit)) return 'Total slots must be a positive number';
    if (!isNonNegativeInteger(slotForm.walkInTokenLimit)) return 'Walk-in tokens must be zero or more';
    if (normalizeFee(slotForm.fee) < MIN_CONSULTATION_FEE) return `Slot fee must be at least INR ${MIN_CONSULTATION_FEE}`;
    if (!isNonNegativeInteger(slotForm.advanceBookingMinutes)) return 'Book-before minutes must be zero or more';
    if (slotForm.availableFrom && slotForm.availableUntil && slotForm.availableFrom > slotForm.availableUntil) {
      return 'Available until cannot be before available from';
    }
    return '';
  };

  const createSlot = async (event) => {
    event.preventDefault();
    const error = validateSlotForm();
    if (error) return toast.error(error);
    
    try {
      const doctorId = slotForm.doctorId;
      const doctor = doctorList.find(d => d._id === doctorId);
      if (!doctor) {
        toast.error('Doctor not found');
        return;
      }
      
      // Create new slot object
      const newSlot = {
        _id: `slot_${Date.now()}`, // Generate temporary ID
        label: slotForm.label.trim(),
        date: slotForm.date,
        availableFrom: slotForm.availableFrom,
        availableUntil: slotForm.availableUntil,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        tokenLimit: Number(slotForm.tokenLimit),
        walkInTokenLimit: Number(slotForm.walkInTokenLimit),
        bookedTokens: 0,
        walkInBookedTokens: 0,
        fee: normalizeFee(slotForm.fee),
        advanceBookingMinutes: Number(slotForm.advanceBookingMinutes),
        isActive: slotForm.isActive
      };
      
      // Update doctor with new slot
      const updatedDoctor = {
        ...doctor,
        slots: [...(doctor.slots || []), newSlot]
      };
      
      // Update on server
      await updateDoctor(doctorId, updatedDoctor);
      
      // Refresh doctors list
      const freshDoctors = await fetchDoctors();
      setDoctorList(Array.isArray(freshDoctors) ? freshDoctors : []);
      
      setSlotFormOpen(false);
      setSlotForm(defaultSlotForm);
      toast.success('Slot added');
    } catch (error) {
      console.error('Error creating slot:', error);
      toast.error('Failed to add slot');
    }
  };

  const deleteDoctor = async (doctor) => {
    const hasBookings = bookings.some((booking) => booking.doctor?._id === doctor._id);
    if (hasBookings) {
      toast.error('This doctor has bookings. Mark unavailable instead of deleting.');
      return;
    }
    try {
      // Mark doctor as unavailable instead of deleting
      const updated = await updateDoctor(doctor._id, { isAvailable: false });
      setDoctorList(prev => prev.map(d => d._id === doctor._id ? updated : d));
      toast.success(`${doctor.name} removed`);
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Failed to remove doctor');
    }
  };

  const decide = async (booking, status) => {
    if (booking.status === 'approved' && status === 'approved') {
      toast.error('This token is already accepted');
      return;
    }
    const adminNote = status === 'approved'
      ? 'Payment proof verified. Token accepted by JK Hospital staff.'
      : 'Your appointment token is cancelled due to verification reasons. Please contact JK Hospital reception at 7845265507.';
    
    try {
      // Update appointment status via API
      const updated = await updateAppointment(booking._id, { 
        status, 
        adminNote,
        verificationStatus: status === 'approved' ? 'verified' : 'rejected'
      });
      
      // Refresh bookings list
      const freshBookings = await fetchAppointments();
      setBookings(Array.isArray(freshBookings) ? freshBookings : []);
      
      // Send email notification
      await api.post('/local-mail/appointment-status', {
        email: booking.patientEmail,
        patientName: booking.patientName,
        doctorName: booking.doctor?.name,
        tokenNumber: booking.tokenNumber,
        status,
        adminNote
      }).then(() => toast.success(`Token ${status} and email sent`)).catch(() => toast.success(`Token ${status} locally`));
      
      return updated;
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update appointment status');
    }
  };

  if (!unlocked) {
    return (
    <main className="hospital-bg grid min-h-[calc(100vh-4rem)] place-items-center py-12">
        <motion.form onSubmit={login} className="glass w-full max-w-md rounded-lg p-8 text-center" initial={{ opacity: 0, scale: 0.96, rotateX: -8 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-medical-600 text-white shadow-soft">
            <LockKeyhole size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-bold">Admin access</h1>
          <p className="mt-2 text-sm text-slate-500">Reception panel. First unlock sets your encrypted staff password on this device.</p>
          <input className="field mt-6 text-center" type="password" placeholder="Staff password (min 10 chars)" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="btn-primary mt-4 w-full"><ShieldCheck size={18} /> Unlock dashboard</button>
        </motion.form>
      </main>
    );
  }

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-medical-600">Admin control room</p>
          <h1 className="mt-2 text-4xl font-bold">Operations, tokens, refunds, and analytics</h1>
        </div>
        <button type="button" onClick={() => { closeAdminSession(); setUnlocked(false); }} className="btn-secondary px-4 py-2">Lock panel</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total appointments" value={overview.stats.appointments} />
        <MetricCard label="Patients" value={overview.stats.patients} tone="green" />
        <MetricCard label="Pending refunds" value={overview.stats.pendingRefunds} tone="amber" />
        <MetricCard label="Consultation revenue" value={`INR ${overview.stats.consultationRevenue || 0}`} tone="blue" />
        <MetricCard label="Pharmacy revenue" value={`INR ${overview.stats.pharmacyRevenue || 0}`} tone="rose" />
        <MetricCard label="Total revenue" value={`INR ${overview.stats.revenue}`} tone="green" />
      </div>

      <motion.div className="mt-6 flex flex-wrap gap-2">
        {[
          ['overview', 'Overview'],
          ['bookings', 'Bookings'],
          ['doctors', 'Doctors'],
          ['refunds', 'Refunds']
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setAdminTab(id)} className={`tab-pill ${adminTab === id ? 'tab-pill-active' : 'bg-white ring-1 ring-slate-200'}`}>
            {label}
          </button>
        ))}
      </motion.div>

      {adminTab === 'overview' && (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-lg p-5">
          <h2 className="text-xl font-bold">Daily bookings</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="bookings" stroke="#147bd1" fill="#d9efff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-lg p-5">
          <h2 className="text-xl font-bold">Doctor occupancy</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-lg p-5 lg:col-span-2">
          <h2 className="text-xl font-bold">Appointment decision mix</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                    {statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={palette[index % palette.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {statusBreakdown.map((item, index) => (
                <div key={item.name} className="rounded-lg bg-white p-4 dark:bg-slate-900">
                  <div className="mb-3 h-2 w-12 rounded-full" style={{ background: palette[index] }} />
                  <p className="text-sm text-slate-500">{item.name}</p>
                  <p className="mt-1 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      )}

      {adminTab === 'doctors' && (
        <section className="glass mt-8 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-medical-600">Live schedule studio</p>
              <h2 className="text-xl font-bold">Doctor and slot management</h2>
            </div>
            <button type="button" onClick={openDoctorForm} className="btn-primary px-4 py-2"><Plus size={16} /> Add doctor</button>
          </div>
          <div className="mt-4 space-y-5">
            {doctorList.map((doctor) => (
              <motion.div
                key={doctor._id}
                className="premium-card rounded-lg bg-white p-4 shadow-[0_18px_50px_rgba(8,47,73,0.08)]"
                whileHover={{ y: -4, rotateX: 0.6 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <div className="grid gap-4 xl:grid-cols-[112px_1fr]">
                  <img src={doctor.avatar} alt={doctor.name} className="h-28 w-28 rounded-lg object-cover shadow-[0_18px_45px_rgba(15,23,42,0.14)]" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-500">
                      <span className="mb-1 flex items-center gap-1"><Stethoscope size={14} /> Doctor name</span>
                      <input className="field px-3 py-2" value={doctor.name} onChange={(event) => updateDoctor(doctor._id, 'name', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Specialist in
                      <input className="field mt-1 px-3 py-2" value={doctor.specialty} onChange={(event) => updateDoctor(doctor._id, 'specialty', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Department
                      <select className="field mt-1 px-3 py-2" value={doctor.department || 'General Medicine'} onChange={(event) => updateDoctor(doctor._id, 'department', event.target.value)}>
                        {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Qualification
                      <input className="field mt-1 px-3 py-2" value={doctor.qualification || ''} onChange={(event) => updateDoctor(doctor._id, 'qualification', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Experience
                      <input className="field mt-1 px-3 py-2" value={doctor.experience || ''} onChange={(event) => updateDoctor(doctor._id, 'experience', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      <span className="mb-1 flex items-center gap-1"><Image size={14} /> Image URL</span>
                      <input className="field px-3 py-2" value={doctor.avatar} onChange={(event) => updateDoctor(doctor._id, 'avatar', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Base consultant fee
                      <input className="field mt-1 px-3 py-2" type="number" min={MIN_CONSULTATION_FEE} value={doctor.fee} onChange={(event) => updateDoctor(doctor._id, 'fee', event.target.value)} />
                    </label>
                    <label className="text-xs font-bold text-slate-500">
                      Availability
                      <select className="field mt-1 px-3 py-2" value={doctor.isAvailable ? 'yes' : 'no'} onChange={(event) => updateDoctor(doctor._id, 'isAvailable', event.target.value === 'yes')}>
                        <option value="yes">Available</option>
                        <option value="no">On leave</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      Profile
                      <textarea className="field mt-1 min-h-20 px-3 py-2" value={doctor.bio} onChange={(event) => updateDoctor(doctor._id, 'bio', event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openSlotForm(doctor._id)} className="btn-secondary px-3 py-2"><Plus size={15} /> Add regular slot</button>
                  <button type="button" onClick={() => openSlotForm(doctor._id, new Date().toISOString().slice(0, 10))} className="btn-secondary px-3 py-2"><CalendarPlus size={15} /> Add today-only slot</button>
                  <button onClick={() => markLeave(doctor)} className="btn-secondary px-3 py-2">Leave mode</button>
                  <button type="button" onClick={() => handleDeleteDoctor(doctor)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 size={15} className="mr-1 inline" /> Delete doctor</button>
                </div>

                <div className="mt-4 grid gap-3">
                  {doctor.slots.map((slot) => {
                    const booked = slot.bookedTokens || 0;
                    const total = slot.tokenLimit || 0;
                    const remaining = Math.max(total - booked, 0);
                    const walkInBooked = slot.walkInBookedTokens || 0;
                    const walkInTotal = slot.walkInTokenLimit ?? 50;
                    return (
                      <div key={slot._id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <label className="text-xs font-bold text-slate-500">
                            Slot name
                            <input className="field mt-1 px-2 py-1.5" value={slot.label} onChange={(event) => updateSlot(doctor._id, slot._id, 'label', event.target.value)} />
                          </label>
                          <label className="text-xs font-bold text-slate-500">
                            Specific date
                            <input className="field mt-1 px-2 py-1.5" type="date" value={slot.date || ''} onChange={(event) => updateSlot(doctor._id, slot._id, 'date', event.target.value)} />
                          </label>
                          <label className="text-xs font-bold text-slate-500">
                            Available from
                            <input className="field mt-1 px-2 py-1.5" type="date" value={slot.availableFrom || ''} onChange={(event) => updateSlot(doctor._id, slot._id, 'availableFrom', event.target.value)} />
                          </label>
                          <label className="text-xs font-bold text-slate-500">
                            Available until
                            <input className="field mt-1 px-2 py-1.5" type="date" value={slot.availableUntil || ''} onChange={(event) => updateSlot(doctor._id, slot._id, 'availableUntil', event.target.value)} />
                          </label>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
                        <label className="text-xs font-bold text-slate-500">
                          Start
                          <input className="field mt-1 px-2 py-1.5" type="time" value={slot.startTime} onChange={(event) => updateSlot(doctor._id, slot._id, 'startTime', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          End
                          <input className="field mt-1 px-2 py-1.5" type="time" value={slot.endTime} onChange={(event) => updateSlot(doctor._id, slot._id, 'endTime', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Total slots
                          <input className="field mt-1 px-2 py-1.5" type="number" value={total} onChange={(event) => updateSlot(doctor._id, slot._id, 'tokenLimit', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Booked
                          <input className="field mt-1 px-2 py-1.5" type="number" value={booked} onChange={(event) => updateSlot(doctor._id, slot._id, 'bookedTokens', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Remaining
                          <input className="field mt-1 px-2 py-1.5" type="number" value={remaining} onChange={(event) => updateRemaining(doctor._id, slot._id, event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Walk-in tokens
                          <input className="field mt-1 px-2 py-1.5" type="number" min="0" value={walkInTotal} onChange={(event) => updateSlot(doctor._id, slot._id, 'walkInTokenLimit', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Walk-ins booked
                          <input className="field mt-1 px-2 py-1.5" type="number" min="0" value={walkInBooked} onChange={(event) => updateSlot(doctor._id, slot._id, 'walkInBookedTokens', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Fee
                          <input className="field mt-1 px-2 py-1.5" type="number" min={MIN_CONSULTATION_FEE} value={slot.fee ?? doctor.fee} onChange={(event) => updateSlot(doctor._id, slot._id, 'fee', event.target.value)} />
                        </label>
                        <label className="text-xs font-bold text-slate-500">
                          Book before
                          <input className="field mt-1 px-2 py-1.5" type="number" min="0" value={slot.advanceBookingMinutes ?? 60} onChange={(event) => updateSlot(doctor._id, slot._id, 'advanceBookingMinutes', event.target.value)} />
                        </label>
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-wrap-anywhere text-xs text-slate-500">
                            {slot.date ? `Only visible on ${slot.date}` : 'Regular slot'} · future booking {slot.availableUntil ? `until ${slot.availableUntil}` : 'has no end date'} · same-day cutoff {slot.advanceBookingMinutes ?? 60} min
                          </p>
                          <div className="flex gap-2 sm:shrink-0">
                            <button
                              type="button"
                              onClick={() => updateSlot(doctor._id, slot._id, 'isActive', !slot.isActive)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${slot.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                            >
                              {slot.isActive ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(doctor._id, slot._id, slot.label)}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                            >
                              <Trash2 size={14} className="mr-1 inline" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!doctor.slots.length && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No slots yet. Add a regular slot or a date-specific slot.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {adminTab === 'bookings' && (
        <section className="glass mt-8 rounded-lg p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold">Recent bookings</h2>
            <input className="field w-full md:max-w-sm" placeholder="Search bookings..." value={bookingQuery} onChange={(e) => setBookingQuery(e.target.value)} />
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {!filteredBookings.length && <p className="rounded-xl bg-white/70 p-4 text-sm text-slate-500">No bookings match your search.</p>}
            {filteredBookings.map((booking) => {
              const payment = bookingPayment(booking);
              const verified = isOnlineVerifiedPayment(booking);
              const patientName = booking.patientDetails?.name || booking.patient?.name || booking.patientName || 'Patient';
              const patientIdentity = booking.patientId || bookingPatientEmail(booking) || 'No patient ID';
              return (
                <article key={booking._id} className="admin-booking-card">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="admin-card-eyebrow">Patient</p>
                      <h3 className="admin-card-title">{patientName}</h3>
                      <p className="text-wrap-anywhere mt-1 text-xs text-slate-500">{patientIdentity}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <dl className="admin-card-details">
                    <div>
                      <dt>Doctor</dt>
                      <dd>{booking.doctor?.name || '—'}</dd>
                    </div>
                    <div>
                      <dt>Slot</dt>
                      <dd>{booking.slotLabel || '—'}</dd>
                    </div>
                    <div>
                      <dt>Token</dt>
                      <dd>{booking.tokenNumber || 'Pending'}</dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>
                        {verified ? 'Verified online' : payment?.proofDataUrl ? 'Proof uploaded' : 'No proof'}
                      </dd>
                    </div>
                  </dl>

                  <div className="admin-card-actions">
                    {verified ? (
                      <span className="admin-card-static-action">Auto-confirmed</span>
                    ) : (
                      <>
                        {payment?.proofDataUrl && (
                          <button type="button" onClick={() => setSelectedProof(payment)} className="admin-card-button neutral">
                            <Eye size={14} /> View proof
                          </button>
                        )}
                        <button type="button" onClick={() => decide(booking, 'approved')} className="admin-card-button accept">
                          <MailCheck size={14} /> Accept
                        </button>
                        <button type="button" onClick={() => decide(booking, 'declined')} className="admin-card-button decline">
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Patient</th>
                  <th>Doctor</th>
                  <th>Slot</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-4">
                      <p className="text-wrap-anywhere font-bold">{booking.patientDetails?.name || booking.patient?.name || booking.patientName}</p>
                      <p className="text-wrap-anywhere text-xs text-slate-500">{booking.patientId || bookingPatientEmail(booking)}</p>
                    </td>
                    <td className="text-wrap-anywhere">{booking.doctor?.name}</td>
                    <td className="text-wrap-anywhere">{booking.slotLabel}</td>
                    <td>{booking.tokenNumber}</td>
                    <td><StatusBadge status={booking.status} /></td>
                    <td>
                      {isOnlineVerifiedPayment(booking) ? (
                        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Verified online</span>
                      ) : bookingPayment(booking)?.proofDataUrl ? (
                        <button onClick={() => setSelectedProof(bookingPayment(booking))} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Eye size={14} className="mr-1 inline" /> View</button>
                      ) : 'No proof'}
                    </td>
                    <td>
                      {isOnlineVerifiedPayment(booking) ? (
                        <span className="text-xs font-bold text-slate-500">Auto-confirmed</span>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => decide(booking, 'approved')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><MailCheck size={14} className="mr-1 inline" /> Accept</button>
                          <button onClick={() => decide(booking, 'declined')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Decline</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {adminTab === 'refunds' && (
        <section className="glass mt-8 rounded-lg p-5">
          <h2 className="text-xl font-bold">Refund requests</h2>
          <div className="mt-5 space-y-4">
            {!refunds.length && <p className="text-slate-500">No refund requests yet.</p>}
            {refunds.map((refund) => {
              const booking = bookings.find((item) => item._id === refund.appointmentId);
              return (
                <article key={refund._id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-wrap-anywhere font-bold">{refund.email}</p>
                      <p className="text-wrap-anywhere text-sm text-slate-500">{booking?.doctor?.name} · {refund.reason}</p>
                    </div>
                    <StatusBadge status={refund.status} />
                  </div>
                  {refund.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={async () => { 
                        try {
                          await updateRefundRequest(refund._id, { status: 'approved', adminNote: 'Approved by admin' });
                          const freshRefunds = await fetchRefundRequests();
                          setRefunds(Array.isArray(freshRefunds) ? freshRefunds : []);
                          toast.success('Approved');
                        } catch (error) {
                          console.error('Error approving refund:', error);
                          toast.error('Failed to approve refund');
                        }
                      }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Approve</button>
                      <button type="button" onClick={async () => {
                        try {
                          await updateRefundRequest(refund._id, { status: 'declined', adminNote: 'Declined by admin' });
                          const freshRefunds = await fetchRefundRequests();
                          setRefunds(Array.isArray(freshRefunds) ? freshRefunds : []);
                          toast.success('Declined');
                        } catch (error) {
                          console.error('Error declining refund:', error);
                          toast.error('Failed to decline refund');
                        }
                      }} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Decline</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      <Modal
        open={doctorFormOpen}
        title="Add doctor"
        onClose={() => setDoctorFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDoctorFormOpen(false)} className="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" form="doctor-create-form" className="btn-primary px-4 py-2">Save doctor</button>
          </div>
        }
      >
        <form id="doctor-create-form" onSubmit={createDoctor} className="grid gap-3">
          <label className="text-xs font-bold text-slate-500">
            Doctor name
            <input className="field mt-1" required value={doctorForm.name} onChange={(event) => setDoctorForm((value) => ({ ...value, name: event.target.value }))} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Specialty
            <input className="field mt-1" required value={doctorForm.specialty} onChange={(event) => setDoctorForm((value) => ({ ...value, specialty: event.target.value }))} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Department
              <select className="field mt-1" value={doctorForm.department} onChange={(event) => setDoctorForm((value) => ({ ...value, department: event.target.value }))}>
                {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Specialization
              <input className="field mt-1" value={doctorForm.specialization} placeholder="Defaults to specialty" onChange={(event) => setDoctorForm((value) => ({ ...value, specialization: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Qualification
              <input className="field mt-1" required value={doctorForm.qualification} onChange={(event) => setDoctorForm((value) => ({ ...value, qualification: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Experience
              <input className="field mt-1" required value={doctorForm.experience} placeholder="10 years" onChange={(event) => setDoctorForm((value) => ({ ...value, experience: event.target.value }))} />
            </label>
          </div>
          <label className="text-xs font-bold text-slate-500">
            Image URL
            <input className="field mt-1" required type="url" value={doctorForm.avatar} onChange={(event) => setDoctorForm((value) => ({ ...value, avatar: event.target.value }))} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Base consultation fee
              <input className="field mt-1" required type="number" min={MIN_CONSULTATION_FEE} value={doctorForm.fee} onChange={(event) => setDoctorForm((value) => ({ ...value, fee: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Availability
              <select className="field mt-1" value={doctorForm.isAvailable ? 'yes' : 'no'} onChange={(event) => setDoctorForm((value) => ({ ...value, isAvailable: event.target.value === 'yes' }))}>
                <option value="yes">Available</option>
                <option value="no">On leave</option>
              </select>
            </label>
          </div>
          <label className="text-xs font-bold text-slate-500">
            Profile
            <textarea className="field mt-1 min-h-24" required value={doctorForm.bio} onChange={(event) => setDoctorForm((value) => ({ ...value, bio: event.target.value }))} />
          </label>
          
          <hr className="my-2" />
          
          <p className="text-xs font-bold text-slate-700">Doctor Login Credentials</p>
          
          <label className="text-xs font-bold text-slate-500">
            Hospital Email (e.g., firstname@jkhospital.com)
            <input 
              className="field mt-1" 
              required 
              type="email" 
              placeholder="name@jkhospital.com"
              value={doctorForm.email} 
              onChange={(event) => setDoctorForm((value) => ({ ...value, email: event.target.value }))} 
            />
          </label>
          
          <label className="text-xs font-bold text-slate-500">
            Password (min 8 characters)
            <input 
              className="field mt-1" 
              required 
              type="password" 
              placeholder="Create a strong password"
              value={doctorForm.password} 
              onChange={(event) => setDoctorForm((value) => ({ ...value, password: event.target.value }))} 
            />
          </label>
          
          <label className="text-xs font-bold text-slate-500">
            Confirm Password
            <input 
              className="field mt-1" 
              required 
              type="password" 
              placeholder="Re-enter password"
              value={doctorForm.confirmPassword} 
              onChange={(event) => setDoctorForm((value) => ({ ...value, confirmPassword: event.target.value }))} 
            />
          </label>
          
          <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            ℹ️ Doctor will use these credentials to login to the Doctor Dashboard. Email must end with @jkhospital.com.
          </p>
          
          <p className="rounded-lg bg-medical-50 p-3 text-xs text-medical-800">
            Slots are added separately after the doctor is saved, so the system never creates random OP timings.
          </p>
        </form>
      </Modal>
      <Modal
        open={slotFormOpen}
        title="Add slot"
        onClose={() => setSlotFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSlotFormOpen(false)} className="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" form="slot-create-form" className="btn-primary px-4 py-2">Save slot</button>
          </div>
        }
      >
        <form id="slot-create-form" onSubmit={createSlot} className="grid gap-3">
          <label className="text-xs font-bold text-slate-500">
            Slot name
            <input className="field mt-1" required value={slotForm.label} onChange={(event) => setSlotForm((value) => ({ ...value, label: event.target.value }))} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Start time
              <input className="field mt-1" required type="time" value={slotForm.startTime} onChange={(event) => setSlotForm((value) => ({ ...value, startTime: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              End time
              <input className="field mt-1" required type="time" value={slotForm.endTime} onChange={(event) => setSlotForm((value) => ({ ...value, endTime: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Total tokens
              <input className="field mt-1" required type="number" min="1" value={slotForm.tokenLimit} onChange={(event) => setSlotForm((value) => ({ ...value, tokenLimit: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Walk-in tokens
              <input className="field mt-1" required type="number" min="0" value={slotForm.walkInTokenLimit} onChange={(event) => setSlotForm((value) => ({ ...value, walkInTokenLimit: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Slot fee
              <input className="field mt-1" required type="number" min={MIN_CONSULTATION_FEE} value={slotForm.fee} onChange={(event) => setSlotForm((value) => ({ ...value, fee: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Specific date
              <input className="field mt-1" type="date" value={slotForm.date} onChange={(event) => setSlotForm((value) => ({ ...value, date: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Book before minutes
              <input className="field mt-1" required type="number" min="0" value={slotForm.advanceBookingMinutes} onChange={(event) => setSlotForm((value) => ({ ...value, advanceBookingMinutes: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Available from
              <input className="field mt-1" type="date" value={slotForm.availableFrom} onChange={(event) => setSlotForm((value) => ({ ...value, availableFrom: event.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Available until
              <input className="field mt-1" type="date" value={slotForm.availableUntil} onChange={(event) => setSlotForm((value) => ({ ...value, availableUntil: event.target.value }))} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={slotForm.isActive} onChange={(event) => setSlotForm((value) => ({ ...value, isActive: event.target.checked }))} />
            Visible for booking
          </label>
        </form>
      </Modal>
      {selectedProof && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Payment proof</h2>
              <button onClick={() => setSelectedProof(null)} className="rounded-lg border p-2 dark:border-slate-700"><X size={16} /></button>
            </div>
            {selectedProof.proofDataUrl?.startsWith('data:image') ? <img src={selectedProof.proofDataUrl} alt="Payment proof" className="mt-4 max-h-[70vh] w-full rounded-lg object-contain" /> : <p className="text-wrap-anywhere mt-4">Proof file: {selectedProof.proofName}</p>}
            <p className="text-wrap-anywhere mt-4 text-sm text-slate-500">Transaction: {selectedProof.transactionId}</p>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
