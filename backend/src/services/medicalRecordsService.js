import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

export const createMedicalRecord = async (data, userId) => {
  const { data: result, error } = await supabase
    .from('medical_records')
    .insert(toSnakeObj({
      patientId: userId,
      appointmentId: data.appointmentId,
      prescriptionId: data.prescriptionId,
      type: data.type || 'general',
      title: data.title,
      sourceText: data.sourceText,
      aiSummary: data.aiSummary,
      pdfUrl: data.pdfUrl,
      pdfReady: data.pdfReady || false,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;
  return toCamelObj(result?.[0]);
};

export const getMedicalRecordById = async (id) => {
  const { data: result, error } = await supabase
    .from('medical_records')
    .select(`
      *,
      medical_documents (*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .limit(1);

  if (error) throw error;
  if (!result || result.length === 0) return null;

  const record = toCamelObj(result[0]);
  record.documents = toCamelObj(result[0].medical_documents || []);
  return record;
};

export const getUserMedicalRecords = async (userId, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('medical_records')
    .select(`
      *,
      medical_documents (*)
    `)
    .eq('patient_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (result || []).map(row => {
    const record = toCamelObj(row);
    record.documents = toCamelObj(row.medical_documents || []);
    return record;
  });
};

export const getAppointmentMedicalRecords = async (appointmentId) => {
  const { data: result, error } = await supabase
    .from('medical_records')
    .select(`
      *,
      medical_documents (*)
    `)
    .eq('appointment_id', appointmentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (result || []).map(row => {
    const record = toCamelObj(row);
    record.documents = toCamelObj(row.medical_documents || []);
    return record;
  });
};

export const updateMedicalRecord = async (id, data) => {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.sourceText !== undefined) updateData.sourceText = data.sourceText;
  if (data.aiSummary !== undefined) updateData.aiSummary = data.aiSummary;
  if (data.pdfUrl !== undefined) updateData.pdfUrl = data.pdfUrl;
  if (data.pdfReady !== undefined) updateData.pdfReady = data.pdfReady;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('medical_records')
    .update(toSnakeObj(updateData))
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;

  return getMedicalRecordById(id);
};

export const deleteMedicalRecord = async (id) => {
  const { data: result, error } = await supabase
    .from('medical_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;
  return result && result.length > 0;
};

export const uploadMedicalDocument = async (recordId, documentUrl) => {
  const { data: result, error } = await supabase
    .from('medical_documents')
    .insert({
      medical_record_id: recordId,
      document_url: documentUrl,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return toCamelObj(result?.[0]);
};

export const getMedicalDocuments = async (recordId) => {
  const { data: result, error } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('medical_record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelObj(result || []);
};

export const deleteMedicalDocument = async (documentId) => {
  const { data: result, error } = await supabase
    .from('medical_documents')
    .delete()
    .eq('id', documentId)
    .select();

  if (error) throw error;
  return result && result.length > 0;
};
