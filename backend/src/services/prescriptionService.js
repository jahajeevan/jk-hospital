import { supabase, toCamelObj, toSnakeObj } from '../config/supabase.js';

export const createPrescription = async (data, userId) => {
  const { data: result, error } = await supabase
    .from('prescriptions')
    .insert(toSnakeObj({
      appointmentId: data.appointmentId,
      doctorId: data.doctorId,
      patientId: userId,
      symptoms: data.symptoms,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    .select();

  if (error) throw error;
  
  const prescription = toCamelObj(result?.[0]);
  
  // Attach medicines if provided
  if (data.medicines && data.medicines.length > 0) {
    const medicines = await createPrescriptionMedicines(prescription.id, data.medicines);
    prescription.medicines = medicines;
  } else {
    prescription.medicines = [];
  }
  
  return prescription;
};

export const getPrescriptionById = async (id) => {
  const { data: result, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      prescription_medicines (*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .limit(1);

  if (error) throw error;
  if (!result || result.length === 0) return null;

  const prescription = toCamelObj(result[0]);
  prescription.medicines = toCamelObj(result[0].prescription_medicines || []);
  return prescription;
};

export const getPrescriptionsByAppointment = async (appointmentId) => {
  const { data: result, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      prescription_medicines (*)
    `)
    .eq('appointment_id', appointmentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (result || []).map(row => {
    const prescription = toCamelObj(row);
    prescription.medicines = toCamelObj(row.prescription_medicines || []);
    return prescription;
  });
};

export const getUserPrescriptions = async (userId, limit = 50, offset = 0) => {
  const { data: result, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      prescription_medicines (*)
    `)
    .eq('patient_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (result || []).map(row => {
    const prescription = toCamelObj(row);
    prescription.medicines = toCamelObj(row.prescription_medicines || []);
    return prescription;
  });
};

export const updatePrescription = async (id, data) => {
  const updateData = {};
  if (data.symptoms !== undefined) updateData.symptoms = data.symptoms;
  if (data.notes !== undefined) updateData.notes = data.notes;
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('prescriptions')
    .update(toSnakeObj(updateData))
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!result || result.length === 0) return null;

  // Fetch with medicines
  return getPrescriptionById(id);
};

export const deletePrescription = async (id) => {
  const { data: result, error } = await supabase
    .from('prescriptions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;
  return result && result.length > 0;
};

export const createPrescriptionMedicines = async (prescriptionId, medicines) => {
  if (!medicines || medicines.length === 0) return [];

  const medicineRecords = medicines.map(med => ({
    prescription_id: prescriptionId,
    medicine_name: med.name || med.medicineName,
    morning: med.morning || '',
    afternoon: med.afternoon || '',
    night: med.night || '',
    days: med.days || 0,
    notes: med.notes || ''
  }));

  const { data: result, error } = await supabase
    .from('prescription_medicines')
    .insert(medicineRecords)
    .select();

  if (error) throw error;
  return toCamelObj(result || []);
};

export const updatePrescriptionMedicines = async (prescriptionId, medicines) => {
  // prescription_medicines has no deleted_at column, and replacing a
  // prescription's medicine list is a true replace (not an archive), so hard
  // delete the old rows before inserting the new set.
  await supabase
    .from('prescription_medicines')
    .delete()
    .eq('prescription_id', prescriptionId);

  return createPrescriptionMedicines(prescriptionId, medicines);
};
