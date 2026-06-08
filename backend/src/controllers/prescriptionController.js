import * as prescriptionService from '../services/prescriptionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createPrescription = asyncHandler(async (req, res) => {
  const { appointmentId, doctorId, symptoms, medicines, notes } = req.body;
  
  // Validation
  if (!appointmentId) {
    const error = new Error('Appointment ID is required');
    error.statusCode = 400;
    throw error;
  }
  if (!doctorId) {
    const error = new Error('Doctor ID is required');
    error.statusCode = 400;
    throw error;
  }

  const prescription = await prescriptionService.createPrescription(
    { appointmentId, doctorId, symptoms, medicines, notes },
    req.user._id
  );

  res.status(201).json({
    success: true,
    prescription,
    timestamp: new Date().toISOString()
  });
});

export const getPrescription = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.getPrescriptionById(req.params.id);

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify user owns this prescription
  if (prescription.patientId !== req.user._id && req.user.role !== 'admin') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  res.json({
    success: true,
    prescription,
    timestamp: new Date().toISOString()
  });
});

export const getUserPrescriptions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const prescriptions = await prescriptionService.getUserPrescriptions(
    req.user._id,
    limit,
    offset
  );

  res.json({
    success: true,
    prescriptions,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const getAppointmentPrescription = asyncHandler(async (req, res) => {
  const prescriptions = await prescriptionService.getPrescriptionsByAppointment(
    req.params.appointmentId
  );

  if (prescriptions.length === 0) {
    res.json({
      success: true,
      prescription: null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Return first (should be only one)
  const prescription = prescriptions[0];
  res.json({
    success: true,
    prescription,
    timestamp: new Date().toISOString()
  });
});

export const updatePrescription = asyncHandler(async (req, res) => {
  // Verify ownership first
  const prescription = await prescriptionService.getPrescriptionById(req.params.id);

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (prescription.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prescriptionService.updatePrescription(req.params.id, req.body);

  res.json({
    success: true,
    prescription: updated,
    timestamp: new Date().toISOString()
  });
});

export const deletePrescription = asyncHandler(async (req, res) => {
  // Verify ownership
  const prescription = await prescriptionService.getPrescriptionById(req.params.id);

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (prescription.patientId !== req.user._id && req.user.role !== 'admin') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await prescriptionService.deletePrescription(req.params.id);

  res.json({
    success: true,
    message: 'Prescription deleted successfully',
    timestamp: new Date().toISOString()
  });
});

export const updatePrescriptionMedicines = asyncHandler(async (req, res) => {
  const { medicines } = req.body;

  if (!medicines || !Array.isArray(medicines)) {
    const error = new Error('Medicines array is required');
    error.statusCode = 400;
    throw error;
  }

  // Verify ownership
  const prescription = await prescriptionService.getPrescriptionById(req.params.id);

  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (prescription.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prescriptionService.updatePrescriptionMedicines(
    req.params.id,
    medicines
  );

  res.json({
    success: true,
    medicines: updated,
    timestamp: new Date().toISOString()
  });
});

export default {
  createPrescription,
  getPrescription,
  getUserPrescriptions,
  getAppointmentPrescription,
  updatePrescription,
  deletePrescription,
  updatePrescriptionMedicines
};
