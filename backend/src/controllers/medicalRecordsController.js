import * as medicalRecordsService from '../services/medicalRecordsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createMedicalRecord = asyncHandler(async (req, res) => {
  const { title, type, sourceText, aiSummary, pdfUrl, appointmentId, prescriptionId } = req.body;

  if (!title) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  const record = await medicalRecordsService.createMedicalRecord(
    { title, type, sourceText, aiSummary, pdfUrl, appointmentId, prescriptionId },
    req.user._id
  );

  res.status(201).json({
    success: true,
    record,
    timestamp: new Date().toISOString()
  });
});

export const getMedicalRecord = asyncHandler(async (req, res) => {
  const record = await medicalRecordsService.getMedicalRecordById(req.params.id);

  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify user owns this record
  if (record.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  res.json({
    success: true,
    record,
    timestamp: new Date().toISOString()
  });
});

export const getUserMedicalRecords = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const records = await medicalRecordsService.getUserMedicalRecords(
    req.user._id,
    limit,
    offset
  );

  res.json({
    success: true,
    records,
    pagination: { limit, offset },
    timestamp: new Date().toISOString()
  });
});

export const updateMedicalRecord = asyncHandler(async (req, res) => {
  // Verify ownership
  const record = await medicalRecordsService.getMedicalRecordById(req.params.id);

  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  if (record.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const updated = await medicalRecordsService.updateMedicalRecord(req.params.id, req.body);

  res.json({
    success: true,
    record: updated,
    timestamp: new Date().toISOString()
  });
});

export const deleteMedicalRecord = asyncHandler(async (req, res) => {
  // Verify ownership
  const record = await medicalRecordsService.getMedicalRecordById(req.params.id);

  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  if (record.patientId !== req.user._id && req.user.role !== 'admin') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await medicalRecordsService.deleteMedicalRecord(req.params.id);

  res.json({
    success: true,
    message: 'Medical record deleted successfully',
    timestamp: new Date().toISOString()
  });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const { documentUrl, fileName } = req.body;

  if (!documentUrl) {
    const error = new Error('Document URL is required');
    error.statusCode = 400;
    throw error;
  }

  // Verify record ownership
  const record = await medicalRecordsService.getMedicalRecordById(req.params.id);

  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  if (record.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const document = await medicalRecordsService.uploadMedicalDocument(req.params.id, documentUrl, fileName);

  res.status(201).json({
    success: true,
    document,
    timestamp: new Date().toISOString()
  });
});

export const getDocuments = asyncHandler(async (req, res) => {
  // Verify record ownership
  const record = await medicalRecordsService.getMedicalRecordById(req.params.id);

  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  if (record.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  const documents = await medicalRecordsService.getMedicalDocuments(req.params.id);

  res.json({
    success: true,
    documents,
    timestamp: new Date().toISOString()
  });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await medicalRecordsService.getMedicalDocumentOwner(req.params.documentId);

  if (!document) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  if (document.record?.patientId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  await medicalRecordsService.deleteMedicalDocument(req.params.documentId);

  res.json({
    success: true,
    message: 'Document deleted successfully',
    timestamp: new Date().toISOString()
  });
});

export default {
  createMedicalRecord,
  getMedicalRecord,
  getUserMedicalRecords,
  updateMedicalRecord,
  deleteMedicalRecord,
  uploadDocument,
  getDocuments,
  deleteDocument
};
