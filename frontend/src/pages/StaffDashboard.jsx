import { Activity, Bell, ClipboardCheck, FileText, Pill, Plus, ReceiptText, Search, Stethoscope, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import MetricCard from '../components/MetricCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  DEPARTMENTS,
  createWalkInBooking,
  getInventoryAlerts,
  getLocalAuditLogs,
  getLocalBookings,
  getLocalDoctors,
  getLocalInventory,
  getLocalNotifications,
  markPatientArrived,
  removeLocalMedicine,
  saveLocalMedicine,
  savePharmacyBillForBooking,
  savePrescriptionForBooking,
  updateAppointmentWorkflow
} from '../utils/localStore.js';

const tabs = [
  ['reception', 'Reception'],
  ['doctor', 'Doctor'],
  ['pharmacy', 'Pharmacy'],
  ['inventory', 'Inventory'],
  ['audit', 'Audit']
];

const roleMeta = {
  reception: {
    badge: 'Receptionist dashboard',
    title: 'Reception desk',
    text: 'Verify bookings, filter arrivals by doctor and time, register walk-ins, and move patients into the doctor queue.'
  },
  doctor: {
    badge: 'Doctor dashboard',
    title: 'Doctor consultation queue',
    text: 'See only your patients, start consultation, enter symptoms, add medicines, and send prescriptions to pharmacy.'
  },
  pharmacy: {
    badge: 'Pharmacist dashboard',
    title: 'Pharmacy billing desk',
    text: 'Receive doctor prescriptions, select dispensed medicines, collect payment, and complete the visit.'
  },
  inventory: {
    badge: 'Inventory',
    title: 'Medicine inventory',
    text: 'Maintain medicine stock, batch numbers, expiry dates, and stock alerts.'
  },
  audit: {
    badge: 'Audit',
    title: 'Activity audit trail',
    text: 'Review staff actions and workflow events.'
  }
};

const emptyRx = { symptoms: '', medicines: [{ name: '', morning: '', afternoon: '', night: '', days: '' }] };
const emptyMedicine = { name: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', currentStock: '', minimumStockLevel: '' };

const patientName = (booking) => booking.patientDetails?.name || booking.patientName || 'Patient';
const patientPhone = (booking) => booking.patientDetails?.phone || booking.patient?.phone || '';
const statusOpenForReception = new Set(['approved', 'confirmed', 'payment_submitted', 'arrived', 'in_progress', 'prescription_generated', 'pharmacy_pending']);

export default function StaffDashboard({ initialTab = 'reception', standalone = false }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [bookings, setBookings] = useState(() => getLocalBookings());
  const [doctors, setDoctors] = useState(() => getLocalDoctors());
  const [inventory, setInventory] = useState(() => getLocalInventory());
  const [query, setQuery] = useState('');
  const [walkIn, setWalkIn] = useState({ patientName: '', mobile: '', department: DEPARTMENTS[0], doctorId: '' });
  const [rxBookingId, setRxBookingId] = useState('');
  const [rxForm, setRxForm] = useState(emptyRx);
  const [billBookingId, setBillBookingId] = useState('');
  const [billItems, setBillItems] = useState([{ medicineId: '', name: '', quantity: 1, unitPrice: 0 }]);
  const [medicineForm, setMedicineForm] = useState(emptyMedicine);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

  const reload = () => {
    setBookings(getLocalBookings());
    setDoctors(getLocalDoctors());
    setInventory(getLocalInventory());
  };

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const currentDoctor = useMemo(() => {
    if (user?.role !== 'doctor') return null;
    return doctors.find((doctor) => doctor.email?.toLowerCase() === user.email?.toLowerCase()) || null;
  }, [doctors, user]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (doctorFilter && booking.doctor?._id !== doctorFilter) return false;
      if (timeFilter && booking.slotLabel !== timeFilter) return false;
      if (!value) return true;
      return (
      [patientName(booking), patientPhone(booking), booking.tokenNumber, booking.doctor?.name, booking.status]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(value))
      );
    });
  }, [bookings, doctorFilter, query, timeFilter]);

  const waiting = bookings.filter((item) => ['arrived', 'approved', 'confirmed'].includes(item.status));
  const activeDoctorQueue = bookings.filter((item) => {
    if (!['arrived', 'in_progress'].includes(item.status)) return false;
    if (user?.role !== 'doctor') return true;
    return Boolean(currentDoctor && item.doctor?._id === currentDoctor._id);
  });
  const pharmacyQueue = bookings.filter((item) => ['prescription_generated', 'pharmacy_pending'].includes(item.status));
  const completedToday = bookings.filter((item) => item.status === 'completed');
  const alerts = getInventoryAlerts();
  const notifications = getLocalNotifications({ role: tab === 'pharmacy' ? 'pharmacist' : tab });

  const submitWalkIn = () => {
    if (!walkIn.patientName.trim() || walkIn.mobile.length !== 10 || !walkIn.doctorId) {
      toast.error('Enter patient name, 10-digit mobile, and doctor');
      return;
    }
    createWalkInBooking(walkIn);
    setWalkIn({ patientName: '', mobile: '', department: DEPARTMENTS[0], doctorId: '' });
    reload();
    toast.success('Walk-in registered and marked arrived');
  };

  const updateStatus = (id, status, role, note = '') => {
    updateAppointmentWorkflow(id, status, { role, actor: role === 'doctor' ? 'Doctor' : 'Receptionist', note });
    reload();
    toast.success('Status updated');
  };

  const addRxMedicine = () => setRxForm((value) => ({ ...value, medicines: [...value.medicines, { name: '', morning: '', afternoon: '', night: '', days: '' }] }));

  const submitPrescription = () => {
    if (!rxBookingId || !rxForm.symptoms.trim()) return toast.error('Select patient and enter symptoms');
    savePrescriptionForBooking({ bookingId: rxBookingId, doctorName: currentDoctor?.name || 'Doctor', diagnosis: '', advice: '', followUpRequired: false, followUpDate: '', followUpNotes: '', remarks: '', ...rxForm });
    setRxBookingId('');
    setRxForm(emptyRx);
    reload();
    toast.success('Prescription saved and sent to pharmacy');
  };

  const visibleTabs = standalone ? [] : tabs;
  const meta = roleMeta[tab] || roleMeta.reception;
  const slotOptions = Array.from(new Set(bookings.map((item) => item.slotLabel).filter(Boolean)));

  const chooseBillMedicine = (index, medicineId) => {
    const medicine = inventory.find((item) => item._id === medicineId);
    setBillItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, medicineId, name: medicine?.name || '', unitPrice: medicine?.sellingPrice || 0 } : item));
  };

  const submitBill = () => {
    if (!billBookingId || !billItems.some((item) => item.name && Number(item.quantity) > 0)) return toast.error('Select prescription and add medicines');
    savePharmacyBillForBooking({ bookingId: billBookingId, items: billItems, paymentMethod: 'Cash' });
    setBillBookingId('');
    setBillItems([{ medicineId: '', name: '', quantity: 1, unitPrice: 0 }]);
    reload();
    toast.success('Bill paid, inventory updated, visit summary saved');
  };

  const submitMedicine = () => {
    if (!medicineForm.name.trim()) return toast.error('Enter medicine name');
    saveLocalMedicine(medicineForm);
    setMedicineForm(emptyMedicine);
    reload();
    toast.success('Inventory updated');
  };

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad">
        <section className="patient-hero-panel">
          <div>
            <span className="live-badge">{meta.badge}</span>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{meta.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{meta.text}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Waiting patients" value={waiting.length} />
          <MetricCard label="Doctor queue" value={activeDoctorQueue.length} tone="green" />
          <MetricCard label="Pharmacy pending" value={pharmacyQueue.length} tone="amber" />
          <MetricCard label="Completed visits" value={completedToday.length} tone="rose" />
        </div>

        {visibleTabs.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {visibleTabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`tab-pill ${tab === id ? 'tab-pill-active' : 'bg-white ring-1 ring-slate-200'}`}>{label}</button>
          ))}
        </div>
        ) : null}

        {notifications.length ? (
          <section className="patient-panel mt-6 rounded-xl p-4">
            <div className="flex items-center gap-2 font-bold"><Bell size={18} className="text-medical-600" /> Notifications</div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {notifications.slice(0, 4).map((item) => <p key={item._id} className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-100"><strong>{item.title}</strong><br />{item.message}</p>)}
            </div>
          </section>
        ) : null}

        {tab === 'reception' && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="patient-panel rounded-xl p-5">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Plus size={19} /> Walk-in patient</h2>
              <div className="mt-4 grid gap-3">
                <input className="field" placeholder="Patient name" value={walkIn.patientName} onChange={(e) => setWalkIn((v) => ({ ...v, patientName: e.target.value }))} />
                <input className="field" inputMode="numeric" maxLength={10} placeholder="Mobile number" value={walkIn.mobile} onChange={(e) => setWalkIn((v) => ({ ...v, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                <select className="field" value={walkIn.department} onChange={(e) => setWalkIn((v) => ({ ...v, department: e.target.value, doctorId: '' }))}>
                  {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className="field" value={walkIn.doctorId} onChange={(e) => setWalkIn((v) => ({ ...v, doctorId: e.target.value }))}>
                  <option value="">Select doctor</option>
                  {doctors.filter((doctor) => doctor.department === walkIn.department).map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
                </select>
                <button type="button" onClick={submitWalkIn} className="btn-primary w-full">Create arrived token</button>
              </div>
            </section>
            <section className="patient-panel rounded-xl p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><Search size={19} /> Reception queue</h2>
                <input className="field md:max-w-xs" placeholder="Search name, mobile, token" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select className="field" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                  <option value="">All doctors</option>
                  {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
                </select>
                <select className="field" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <option value="">All booked times</option>
                  {slotOptions.map((slotLabel) => <option key={slotLabel} value={slotLabel}>{slotLabel}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-3">
                {filtered.filter((booking) => statusOpenForReception.has(booking.status)).map((booking) => (
                  <article key={booking._id} className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{patientName(booking)} · Token #{booking.tokenNumber || 'Pending'}</p>
                        <p className="text-sm text-slate-500">{patientPhone(booking)} · {booking.doctor?.name} · {booking.slotLabel}</p>
                        <p className="text-xs text-slate-500">Queue position {booking.queuePosition || booking.tokenNumber || 0} · {Math.max((booking.queuePosition || booking.tokenNumber || 1) - 1, 0)} ahead · ~{booking.estimatedWaitMinutes || 0} min</p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['approved', 'confirmed', 'payment_submitted'].includes(booking.status) && <button className="btn-secondary px-3 py-2 text-xs" onClick={() => { markPatientArrived(booking._id); reload(); toast.success('Patient marked arrived'); }}><UserCheck size={14} /> Mark arrived</button>}
                      <button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => updateStatus(booking._id, 'no_show', 'receptionist')}>No show</button>
                      <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => updateStatus(booking._id, 'cancelled_by_hospital', 'receptionist')}>Cancel by hospital</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'doctor' && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="patient-panel rounded-xl p-5">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Stethoscope size={19} /> Waiting queue</h2>
              <div className="mt-4 grid gap-3">
                {activeDoctorQueue.map((booking) => (
                  <article key={booking._id} className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div><p className="font-bold">{patientName(booking)} · #{booking.tokenNumber}</p><p className="text-sm text-slate-500">{booking.patientDetails?.age || '—'} yrs · {booking.patientDetails?.gender || '—'} · {patientPhone(booking)}</p></div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {booking.status === 'arrived' && <button className="btn-secondary px-3 py-2 text-xs" onClick={() => updateStatus(booking._id, 'in_progress', 'doctor', 'Consultation started')}>Start consultation</button>}
                      <button className="btn-primary px-3 py-2 text-xs" onClick={() => setRxBookingId(booking._id)}><ClipboardCheck size={14} /> Write prescription</button>
                    </div>
                  </article>
                ))}
                {!activeDoctorQueue.length && (
                  <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    {currentDoctor ? `No arrived patients for ${currentDoctor.name}.` : 'No arrived patients yet.'}
                  </p>
                )}
              </div>
            </section>
            <section className="patient-panel rounded-xl p-5">
              <h2 className="flex items-center gap-2 text-xl font-bold"><FileText size={19} /> Prescription form</h2>
              <select className="field mt-4" value={rxBookingId} onChange={(e) => setRxBookingId(e.target.value)}>
                <option value="">Select current patient</option>
                {activeDoctorQueue.map((booking) => <option key={booking._id} value={booking._id}>#{booking.tokenNumber} · {patientName(booking)}</option>)}
              </select>
              <textarea className="field mt-3" rows={3} placeholder="Symptoms" value={rxForm.symptoms} onChange={(e) => setRxForm((v) => ({ ...v, symptoms: e.target.value }))} />
              <div className="mt-3 grid gap-2">
                {rxForm.medicines.map((medicine, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-100 md:grid-cols-5">
                    <input className="field px-2 py-1.5" placeholder="Medicine" value={medicine.name} onChange={(e) => setRxForm((v) => ({ ...v, medicines: v.medicines.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) }))} />
                    {['morning', 'afternoon', 'night', 'days'].map((field) => <input key={field} className="field px-2 py-1.5" placeholder={field} value={medicine[field]} onChange={(e) => setRxForm((v) => ({ ...v, medicines: v.medicines.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: e.target.value } : item) }))} />)}
                  </div>
                ))}
                <button type="button" onClick={addRxMedicine} className="btn-secondary px-3 py-2 text-xs">Add medicine row</button>
              </div>
              <button type="button" onClick={submitPrescription} className="btn-primary mt-4 w-full">Save and send to pharmacy</button>
            </section>
          </div>
        )}

        {tab === 'pharmacy' && (
          <section className="patient-panel mt-8 rounded-xl p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><ReceiptText size={19} /> Pharmacy billing</h2>
            <select className="field mt-4" value={billBookingId} onChange={(e) => setBillBookingId(e.target.value)}>
              <option value="">Select prescription</option>
              {pharmacyQueue.map((booking) => <option key={booking._id} value={booking._id}>#{booking.tokenNumber} · {patientName(booking)} · {booking.doctor?.name}</option>)}
            </select>
            <div className="mt-4 grid gap-3">
              {billItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-100 md:grid-cols-[1fr_120px_140px]">
                  <select className="field" value={item.medicineId} onChange={(e) => chooseBillMedicine(index, e.target.value)}>
                    <option value="">Select medicine</option>
                    {inventory.map((medicine) => <option key={medicine._id} value={medicine._id}>{medicine.name} · stock {medicine.currentStock}</option>)}
                  </select>
                  <label className="text-xs font-bold text-slate-500">Qty<input className="field mt-1" type="number" min="1" value={item.quantity} onChange={(e) => setBillItems((items) => items.map((billItem, itemIndex) => itemIndex === index ? { ...billItem, quantity: e.target.value } : billItem))} /></label>
                  <label className="text-xs font-bold text-slate-500">Unit price<input className="field mt-1" type="number" min="0" value={item.unitPrice} onChange={(e) => setBillItems((items) => items.map((billItem, itemIndex) => itemIndex === index ? { ...billItem, unitPrice: e.target.value } : billItem))} /></label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary px-3 py-2" type="button" onClick={() => setBillItems((items) => [...items, { medicineId: '', name: '', quantity: 1, unitPrice: 0 }])}>Add item</button>
              <button className="btn-primary px-3 py-2" type="button" onClick={submitBill}>Mark paid and complete visit</button>
            </div>
          </section>
        )}

        {tab === 'inventory' && (
          <section className="patient-panel mt-8 rounded-xl p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Pill size={19} /> Medicine inventory</h2>
            {alerts.length ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">{alerts.length} stock or expiry alert{alerts.length > 1 ? 's' : ''} need attention.</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {['name', 'batchNumber', 'expiryDate', 'purchasePrice', 'sellingPrice', 'currentStock', 'minimumStockLevel'].map((field) => (
                <input key={field} className="field" type={field === 'expiryDate' ? 'date' : ['purchasePrice', 'sellingPrice', 'currentStock', 'minimumStockLevel'].includes(field) ? 'number' : 'text'} placeholder={field.replace(/([A-Z])/g, ' $1')} value={medicineForm[field]} onChange={(e) => setMedicineForm((v) => ({ ...v, [field]: e.target.value }))} />
              ))}
              <button type="button" className="btn-primary" onClick={submitMedicine}>Save medicine</button>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-slate-500"><tr><th className="py-3">Medicine</th><th>Batch</th><th>Expiry</th><th>Buy</th><th>Sell</th><th>Stock</th><th>Alert</th><th /></tr></thead>
                <tbody>
                  {inventory.map((medicine) => (
                    <tr key={medicine._id} className="border-t border-slate-200">
                      <td className="py-3 font-bold">{medicine.name}</td><td>{medicine.batchNumber}</td><td>{medicine.expiryDate}</td><td>INR {medicine.purchasePrice}</td><td>INR {medicine.sellingPrice}</td><td>{medicine.currentStock}</td>
                      <td>{medicine.currentStock <= medicine.minimumStockLevel ? <span className="text-xs font-bold text-rose-700">LOW STOCK</span> : 'OK'}</td>
                      <td><button type="button" className="text-xs font-bold text-rose-700" onClick={() => { removeLocalMedicine(medicine._id); reload(); }}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'audit' && (
          <section className="patient-panel mt-8 rounded-xl p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Activity size={19} /> Audit trail</h2>
            <div className="mt-4 grid gap-3">
              {getLocalAuditLogs().map((entry) => (
                <article key={entry._id} className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-100">
                  <p className="font-bold">{entry.action}</p>
                  <p className="text-slate-500">{entry.role} · {entry.actor} · {new Date(entry.timestamp).toLocaleString()}</p>
                  {entry.details ? <p className="mt-1 text-slate-600">{entry.details}</p> : null}
                </article>
              ))}
              {!getLocalAuditLogs().length && <p className="text-sm text-slate-500">No audit events yet.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
