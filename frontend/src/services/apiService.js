/**
 * API Service Layer
 * All Supabase API calls go through this service
 * Uses JWT token for staff/doctors and Clerk token for patients
 */

import api from '../api/client.js';
import { normalizeDoctor, normalizeDoctors } from '../utils/doctorUtils.js';

const DOCTOR_CACHE_KEY = 'jk_cached_doctors';

export const DEFAULT_DOCTORS = normalizeDoctors([
  {
    id: 'doc-viji-001',
    name: 'Dr. Viji',
    specialty: 'Cardiologist',
    department: 'Cardiology',
    experience: 15,
    qualification: 'MBBS, MD',
    bio: 'Heart disease specialist with 15 years of experience',
    fee: 500,
    is_available: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
    email: 'viji@jkhospital.com',
    phone: '9876543210',
    slots: [
      { id: 'viji-morning', label: 'Morning', startTime: '09:00', endTime: '12:00', tokenLimit: 20, bookedTokens: 0, fee: 500, isActive: true },
      { id: 'viji-evening', label: 'Evening OP', startTime: '18:00', endTime: '21:00', tokenLimit: 30, bookedTokens: 0, fee: 500, isActive: true }
    ]
  },
  {
    id: 'doc-sugu-001',
    name: 'Dr. Sugu',
    specialty: 'Dermatologist',
    department: 'Dermatology',
    experience: 10,
    qualification: 'MBBS, MD',
    bio: 'Skin specialist with 10 years of experience',
    fee: 500,
    is_available: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
    email: 'sugu@jkhospital.com',
    phone: '9876543212',
    slots: [
      { id: 'sugu-morning', label: 'Morning OP', startTime: '09:00', endTime: '12:30', tokenLimit: 30, bookedTokens: 0, fee: 500, isActive: true },
      { id: 'sugu-evening', label: 'Evening OP', startTime: '20:00', endTime: '22:30', tokenLimit: 35, bookedTokens: 0, fee: 500, isActive: true }
    ]
  },
  {
    id: 'doc-jahan-001',
    name: 'Dr. Jahan',
    specialty: 'ENT',
    department: 'ENT',
    experience: 12,
    qualification: 'MBBS, MD',
    bio: 'ENT specialist and surgeon for pediatric and adult patients.',
    fee: 500,
    is_available: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80',
    email: 'jahan@jkhospital.com',
    phone: '9876543211',
    slots: [
      { id: 'jahan-morning', label: 'Morning OP', startTime: '08:00', endTime: '23:30', tokenLimit: 30, bookedTokens: 0, fee: 500, isActive: true },
      { id: 'jahan-evening', label: 'Evening Slot', startTime: '19:00', endTime: '22:00', tokenLimit: 30, bookedTokens: 0, fee: 500, isActive: true }
    ]
  }
]);

export const getCachedDoctors = () => {
  if (typeof window === 'undefined') return DEFAULT_DOCTORS;
  try {
    const cached = JSON.parse(sessionStorage.getItem(DOCTOR_CACHE_KEY) || 'null');
    return Array.isArray(cached) && cached.length ? normalizeDoctors(cached) : DEFAULT_DOCTORS;
  } catch {
    return DEFAULT_DOCTORS;
  }
};

const cacheDoctors = (doctors) => {
  if (typeof window === 'undefined' || !Array.isArray(doctors) || !doctors.length) return;
  try {
    sessionStorage.setItem(DOCTOR_CACHE_KEY, JSON.stringify(doctors));
  } catch {
    /* cache optional */
  }
};

// ============ DOCTORS ============
export const fetchDoctors = async () => {
  try {
    const response = await api.get('/doctors');
    const doctors = normalizeDoctors(response.data?.doctors || []);
    if (doctors.length) cacheDoctors(doctors);
    console.log('Fetched doctors:', doctors.length > 0 ? `${doctors.length} doctors` : 'Empty list, using fallback');
    return doctors.length ? doctors : getCachedDoctors();
  } catch (error) {
    console.error('Error fetching doctors, returning fallback:', error.message);
    return getCachedDoctors();
  }
};

export const fetchDoctor = async (id) => {
  try {
    const response = await api.get(`/doctors/${id}`);
    return response.data?.doctor ? { doctor: normalizeDoctor(response.data.doctor) } : normalizeDoctor(response.data);
  } catch (error) {
    console.error(`Error fetching doctor ${id}:`, error);
    throw error;
  }
};

export const fetchDoctorSlots = async (doctorId, date) => {
  try {
    const response = await api.get(`/doctors/${doctorId}/availability`, {
      params: { date },
    });
    return response.data?.slots || response.data || [];
  } catch (error) {
    console.error(`Error fetching slots for doctor ${doctorId}:`, error);
    throw error;
  }
};

export const createDoctor = async (doctorData) => {
  try {
    console.log('Creating doctor with API data:', { ...doctorData, password: '[redacted]' });
    const response = await api.post('/admin/doctors', doctorData);
    console.log('Doctor created successfully:', response.data);
    return normalizeDoctor(response.data?.doctor || response.data);
  } catch (error) {
    console.error('API Error creating doctor:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
      headers: error.response?.headers
    });
    throw error;
  }
};

export const updateDoctor = async (id, updates) => {
  try {
    const response = await api.put(`/admin/doctors/${id}`, updates);
    return normalizeDoctor(response.data?.doctor || response.data);
  } catch (error) {
    console.error(`Error updating doctor ${id}:`, error);
    throw error;
  }
};

export const updateDoctorSlot = async (doctorId, slotId, updates) => {
  try {
    const response = await api.patch(`/admin/doctors/${doctorId}/slots/${slotId}`, updates);
    return response.data?.slot || response.data;
  } catch (error) {
    console.error(`Error updating slot ${slotId} for doctor ${doctorId}:`, error);
    throw error;
  }
};

export const createDoctorSlot = async (doctorId, slotData) => {
  try {
    const response = await api.post(`/admin/doctors/${doctorId}/slots`, slotData);
    return response.data?.slot || response.data;
  } catch (error) {
    console.error(`Error creating slot for doctor ${doctorId}:`, error);
    throw error;
  }
};

export const deleteDoctor = async (doctorId) => {
  try {
    const response = await api.delete(`/admin/doctors/${doctorId}`);
    return response.data?.doctor ? { doctor: normalizeDoctor(response.data.doctor) } : response.data;
  } catch (error) {
    console.error(`Error deleting doctor ${doctorId}:`, error);
    throw error;
  }
};

export const deleteSlot = async (slotId) => {
  try {
    const response = await api.delete(`/admin/slots/${slotId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting slot ${slotId}:`, error);
    throw error;
  }
};

// ============ APPOINTMENTS (Bookings) ============
export const fetchAppointments = async () => {
  try {
    const response = await api.get('/admin/bookings');
    return response.data?.appointments || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const fetchUserAppointments = async () => {
  try {
    const response = await api.get('/appointments/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    throw error;
  }
};

export const fetchAppointment = async (id) => {
  try {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching appointment ${id}:`, error);
    throw error;
  }
};

export const createAppointment = async (appointmentData) => {
  try {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id, updates) => {
  try {
    const response = await api.patch(`/appointments/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating appointment ${id}:`, error);
    throw error;
  }
};

export const deleteAppointment = async (id) => {
  try {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting appointment ${id}:`, error);
    throw error;
  }
};

export const fetchRefundRequests = async () => {
  return [];
};

export const updateRefundRequest = async (id, updates) => {
  try {
    const response = await api.patch(`/refunds/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating refund request ${id}:`, error);
    throw error;
  }
};

// ============ PRESCRIPTIONS ============
export const fetchPrescriptions = async () => {
  try {
    const response = await api.get('/prescriptions/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    throw error;
  }
};

export const fetchPrescriptionsByAppointment = async (appointmentId) => {
  try {
    const response = await api.get(`/prescriptions/appointment/${appointmentId}`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching prescriptions for appointment ${appointmentId}:`, error);
    throw error;
  }
};

export const createPrescription = async (prescriptionData) => {
  try {
    const response = await api.post('/prescriptions', prescriptionData);
    return response.data;
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }
};

export const updatePrescription = async (id, updates) => {
  try {
    const response = await api.patch(`/prescriptions/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating prescription ${id}:`, error);
    throw error;
  }
};

// ============ MEDICAL RECORDS ============
export const fetchMedicalRecords = async () => {
  try {
    const response = await api.get('/medical-records/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching medical records:', error);
    throw error;
  }
};

export const fetchMedicalRecord = async (id) => {
  try {
    const response = await api.get(`/medical-records/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching medical record ${id}:`, error);
    throw error;
  }
};

export const createMedicalRecord = async (recordData) => {
  try {
    const response = await api.post('/medical-records', recordData);
    return response.data;
  } catch (error) {
    console.error('Error creating medical record:', error);
    throw error;
  }
};

export const updateMedicalRecord = async (id, updates) => {
  try {
    const response = await api.patch(`/medical-records/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating medical record ${id}:`, error);
    throw error;
  }
};

// ============ PHARMACY INVENTORY ============
export const fetchPharmacyInventory = async (filters = {}) => {
  try {
    const response = await api.get('/pharmacy-inventory', { params: filters });
    return response.data?.items || response.data || [];
  } catch (error) {
    console.error('Error fetching pharmacy inventory:', error);
    throw error;
  }
};

export const fetchInventoryItem = async (id) => {
  try {
    const response = await api.get(`/pharmacy-inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching inventory item ${id}:`, error);
    throw error;
  }
};

export const createInventoryItem = async (itemData) => {
  try {
    const response = await api.post('/pharmacy-inventory', itemData);
    return response.data?.item || response.data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id, updates) => {
  try {
    const response = await api.patch(`/pharmacy-inventory/${id}`, updates);
    return response.data?.item || response.data;
  } catch (error) {
    console.error(`Error updating inventory item ${id}:`, error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const response = await api.delete(`/pharmacy-inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting inventory item ${id}:`, error);
    throw error;
  }
};

// ============ PHARMACY BILLS ============
export const fetchPharmacyBills = async (filters = {}) => {
  try {
    const response = await api.get('/pharmacy-bills', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching pharmacy bills:', error);
    throw error;
  }
};

export const fetchUserPharmacyBills = async () => {
  try {
    const response = await api.get('/pharmacy-bills/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user pharmacy bills:', error);
    throw error;
  }
};

export const fetchPharmacyBill = async (id) => {
  try {
    const response = await api.get(`/pharmacy-bills/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching pharmacy bill ${id}:`, error);
    throw error;
  }
};

export const createPharmacyBill = async (billData) => {
  try {
    const response = await api.post('/pharmacy-bills', billData);
    return response.data;
  } catch (error) {
    console.error('Error creating pharmacy bill:', error);
    throw error;
  }
};

export const updatePharmacyBill = async (id, updates) => {
  try {
    const response = await api.patch(`/pharmacy-bills/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating pharmacy bill ${id}:`, error);
    throw error;
  }
};

// ============ AUDIT LOGS ============
export const fetchAuditLogs = async (filters = {}) => {
  try {
    const response = await api.get('/audit-logs', { params: filters });
    return response.data?.logs || response.data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const createAuditLog = async (logData) => {
  try {
    const response = await api.post('/audit-logs', logData);
    return response.data;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logs are non-critical
  }
};

// ============ NOTIFICATIONS ============
export const fetchNotifications = async (filters = {}) => {
  try {
    const response = await api.get('/notifications', { params: filters });
    return response.data?.notifications || response.data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const createNotification = async (notificationData) => {
  try {
    const response = await api.post('/notifications', notificationData);
    return response.data?.notification || response.data;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
};

// ============ PAYMENTS ============
export const createPayment = async (paymentData) => {
  try {
    const response = await api.post('/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

export const fetchPayment = async (id) => {
  try {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching payment ${id}:`, error);
    throw error;
  }
};

export default api;
