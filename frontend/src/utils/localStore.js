/**
 * Constants and utility functions previously in localStore.js
 * Simplified implementations for the refactored app
 */

// Department list
export const DEPARTMENTS = [
  'General Medicine',
  'Orthopedics',
  'Cardiology',
  'Dermatology',
  'ENT',
  'Pediatrics',
  'Gynecology',
  'Psychiatry'
];

// Slot availability options
export const getWalkInSlotOptions = (doctor, date) => {
  if (!doctor || !doctor.slots) return [];
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = date === todayStr;
  
  return doctor.slots.filter(slot => {
    // Filter slots by date if not today
    if (!isToday && slot.date && slot.date !== date) return false;
    
    // Filter by availability
    if (!slot.isActive) return false;
    
    // Check token availability
    const availableTokens = (slot.tokenLimit || 0) - (slot.bookedTokens || 0);
    const availableWalkIn = (slot.walkInTokenLimit || 0) - (slot.walkInBookedTokens || 0);
    
    return availableTokens > 0 || availableWalkIn > 0;
  });
};

// Mark patient as arrived (placeholder)
export const markPatientArrived = (bookingId) => {
  console.log('Mark patient arrived:', bookingId);
  return { bookingId, arrivedAt: new Date().toISOString() };
};

// Create walk-in booking
export const createWalkInBooking = (walkInData) => {
  const now = new Date();
  return {
    _id: `booking_${Date.now()}`,
    patientName: walkInData.patientName,
    patientEmail: `${walkInData.mobile}@walk-in.local`,
    patientPhone: walkInData.mobile,
    doctor: { _id: walkInData.doctorId },
    doctorId: walkInData.doctorId,
    slotId: walkInData.slotId,
    slotLabel: `Walk-in ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    status: 'arrived',
    isWalkIn: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
};

// Update appointment workflow
export const updateAppointmentWorkflow = (bookingId, status, metadata = {}) => {
  return {
    bookingId,
    status,
    ...metadata,
    updatedAt: new Date().toISOString()
  };
};

// Save prescription for booking
export const savePrescriptionForBooking = (prescriptionData) => {
  return {
    ...prescriptionData,
    _id: prescriptionData._id || `prescription_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
};

// Save pharmacy bill for booking
export const savePharmacyBillForBooking = (billData) => {
  const totalAmount = billData.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  return {
    ...billData,
    _id: billData._id || `bill_${Date.now()}`,
    totalAmount,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
};

// Get inventory alerts
export const getInventoryAlerts = () => {
  return [];
};

// Placeholder for additional utilities
export const getSlotAvailability = (doctor, date) => {
  return getWalkInSlotOptions(doctor, date);
};
