/**
 * API Service Layer
 * All Supabase API calls go through this service
 * Replaces localStorage usage with backend API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ DOCTORS ============
export const fetchDoctors = async () => {
  try {
    const response = await apiClient.get('/doctors');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

export const fetchDoctor = async (id) => {
  try {
    const response = await apiClient.get(`/doctors/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching doctor ${id}:`, error);
    throw error;
  }
};

export const fetchDoctorSlots = async (doctorId, date) => {
  try {
    const response = await apiClient.get(`/doctors/${doctorId}/slots`, {
      params: { date },
    });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching slots for doctor ${doctorId}:`, error);
    throw error;
  }
};

export const createDoctor = async (doctorData) => {
  try {
    const response = await apiClient.post('/doctors', doctorData);
    return response.data;
  } catch (error) {
    console.error('Error creating doctor:', error);
    throw error;
  }
};

export const updateDoctor = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/doctors/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating doctor ${id}:`, error);
    throw error;
  }
};

export const updateDoctorSlot = async (doctorId, slotId, updates) => {
  try {
    const response = await apiClient.patch(`/doctors/${doctorId}/slots/${slotId}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating slot ${slotId} for doctor ${doctorId}:`, error);
    throw error;
  }
};

// ============ APPOINTMENTS (Bookings) ============
export const fetchAppointments = async (filters = {}) => {
  try {
    const response = await apiClient.get('/appointments', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const fetchUserAppointments = async () => {
  try {
    const response = await apiClient.get('/appointments/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    throw error;
  }
};

export const fetchAppointment = async (id) => {
  try {
    const response = await apiClient.get(`/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching appointment ${id}:`, error);
    throw error;
  }
};

export const createAppointment = async (appointmentData) => {
  try {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/appointments/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating appointment ${id}:`, error);
    throw error;
  }
};

export const deleteAppointment = async (id) => {
  try {
    const response = await apiClient.delete(`/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting appointment ${id}:`, error);
    throw error;
  }
};

export const fetchRefundRequests = async (filters = {}) => {
  try {
    const response = await apiClient.get('/refunds', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    throw error;
  }
};

export const updateRefundRequest = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/refunds/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating refund request ${id}:`, error);
    throw error;
  }
};

// ============ PRESCRIPTIONS ============
export const fetchPrescriptions = async () => {
  try {
    const response = await apiClient.get('/prescriptions/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    throw error;
  }
};

export const fetchPrescriptionsByAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/prescriptions/appointment/${appointmentId}`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching prescriptions for appointment ${appointmentId}:`, error);
    throw error;
  }
};

export const createPrescription = async (prescriptionData) => {
  try {
    const response = await apiClient.post('/prescriptions', prescriptionData);
    return response.data;
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error;
  }
};

export const updatePrescription = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/prescriptions/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating prescription ${id}:`, error);
    throw error;
  }
};

// ============ MEDICAL RECORDS ============
export const fetchMedicalRecords = async () => {
  try {
    const response = await apiClient.get('/medical-records/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching medical records:', error);
    throw error;
  }
};

export const fetchMedicalRecord = async (id) => {
  try {
    const response = await apiClient.get(`/medical-records/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching medical record ${id}:`, error);
    throw error;
  }
};

export const createMedicalRecord = async (recordData) => {
  try {
    const response = await apiClient.post('/medical-records', recordData);
    return response.data;
  } catch (error) {
    console.error('Error creating medical record:', error);
    throw error;
  }
};

export const updateMedicalRecord = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/medical-records/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating medical record ${id}:`, error);
    throw error;
  }
};

// ============ PHARMACY INVENTORY ============
export const fetchPharmacyInventory = async (filters = {}) => {
  try {
    const response = await apiClient.get('/pharmacy-inventory', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching pharmacy inventory:', error);
    throw error;
  }
};

export const fetchInventoryItem = async (id) => {
  try {
    const response = await apiClient.get(`/pharmacy-inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching inventory item ${id}:`, error);
    throw error;
  }
};

export const createInventoryItem = async (itemData) => {
  try {
    const response = await apiClient.post('/pharmacy-inventory', itemData);
    return response.data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/pharmacy-inventory/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating inventory item ${id}:`, error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const response = await apiClient.delete(`/pharmacy-inventory/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting inventory item ${id}:`, error);
    throw error;
  }
};

// ============ PHARMACY BILLS ============
export const fetchPharmacyBills = async (filters = {}) => {
  try {
    const response = await apiClient.get('/pharmacy-bills', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching pharmacy bills:', error);
    throw error;
  }
};

export const fetchUserPharmacyBills = async () => {
  try {
    const response = await apiClient.get('/pharmacy-bills/mine');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user pharmacy bills:', error);
    throw error;
  }
};

export const fetchPharmacyBill = async (id) => {
  try {
    const response = await apiClient.get(`/pharmacy-bills/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching pharmacy bill ${id}:`, error);
    throw error;
  }
};

export const createPharmacyBill = async (billData) => {
  try {
    const response = await apiClient.post('/pharmacy-bills', billData);
    return response.data;
  } catch (error) {
    console.error('Error creating pharmacy bill:', error);
    throw error;
  }
};

export const updatePharmacyBill = async (id, updates) => {
  try {
    const response = await apiClient.patch(`/pharmacy-bills/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating pharmacy bill ${id}:`, error);
    throw error;
  }
};

// ============ AUDIT LOGS ============
export const fetchAuditLogs = async (filters = {}) => {
  try {
    const response = await apiClient.get('/audit-logs', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const createAuditLog = async (logData) => {
  try {
    const response = await apiClient.post('/audit-logs', logData);
    return response.data;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logs are non-critical
  }
};

// ============ NOTIFICATIONS ============
export const fetchNotifications = async (filters = {}) => {
  try {
    const response = await apiClient.get('/notifications', { params: filters });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const createNotification = async (notificationData) => {
  try {
    const response = await apiClient.post('/notifications', notificationData);
    return response.data;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
};

// ============ PAYMENTS ============
export const createPayment = async (paymentData) => {
  try {
    const response = await apiClient.post('/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

export const fetchPayment = async (id) => {
  try {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching payment ${id}:`, error);
    throw error;
  }
};

export default apiClient;
