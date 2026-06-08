import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase, toSnakeObj } from '../config/supabase.js';

dotenv.config();

const clearDB = async () => {
  console.log('Clearing old database records in Supabase...');
  await supabase.from('refresh_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('refund_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('doctor_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('doctors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

const hashPassword = async (pwd) => {
  return bcrypt.hash(pwd, 12);
};

const seed = async () => {
  await clearDB();

  console.log('Creating users...');
  const adminPassword = await hashPassword('Admin@12345');
  const patientPassword = await hashPassword('Patient@12345');

  const { error: userErr } = await supabase.from('users').insert([
    toSnakeObj({ name: 'JK Hospital Admin', email: 'admin@jkhospital.local', password: adminPassword, role: 'admin', isVerified: true }),
    toSnakeObj({ name: 'Demo Patient', email: 'patient@jkhospital.local', password: patientPassword, phone: '7845265507', role: 'patient', isVerified: true }),
    toSnakeObj({ name: 'JK Hospital Admin', email: 'admin@jkhospital.com', password: await hashPassword('Admin@123'), role: 'admin', isVerified: true }),
    toSnakeObj({ name: 'JK Hospital Receptionist', email: 'receptionist@jkhospital.com', password: await hashPassword('Reception@123'), role: 'receptionist', isVerified: true }),
    toSnakeObj({ name: 'JK Hospital Pharmacist', email: 'pharmacist@jkhospital.com', password: await hashPassword('Pharmacy@123'), role: 'pharmacist', isVerified: true }),
    toSnakeObj({ name: 'Dr. Vijayakumar', email: 'viji@jkhospital.com', password: await hashPassword('Doctor@123'), role: 'doctor', isVerified: true }),
    toSnakeObj({ name: 'Dr. Jahajeevan', email: 'jahan@jkhospital.com', password: await hashPassword('Doctor@123'), role: 'doctor', isVerified: true }),
    toSnakeObj({ name: 'Dr. Suguna', email: 'sugu@jkhospital.com', password: await hashPassword('Doctor@123'), role: 'doctor', isVerified: true })
  ]);
  if (userErr) throw userErr;

  console.log('Creating doctors and slots...');
  const slots = [
    { label: 'Morning Care', startTime: '09:00', endTime: '11:00', tokenLimit: 18, fee: 500 },
    { label: 'Afternoon Clinic', startTime: '13:00', endTime: '15:00', tokenLimit: 16, fee: 500 },
    { label: 'Evening Review', startTime: '17:00', endTime: '19:00', tokenLimit: 14, fee: 600 }
  ];

  const docs = [
    {
      name: 'Dr. Vijayakumar',
      specialty: 'Orthopedic Specialist',
      bio: 'Joint care, trauma recovery, sports injuries, and mobility restoration.',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Dr. Jahajeevan',
      specialty: 'Pediatric Specialist',
      bio: 'Child health, immunization, growth tracking, and acute pediatric care.',
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Dr. Suguna',
      specialty: 'General Physician',
      bio: 'Primary care, preventive screening, fever care, and chronic condition follow-up.',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80'
    }
  ];

  for (const doc of docs) {
    const { data: newDocList, error: docErr } = await supabase.from('doctors').insert(toSnakeObj(doc)).select('*');
    if (docErr) throw docErr;
    
    const newDoc = newDocList?.[0];
    if (newDoc) {
      const slotsToInsert = slots.map((s) => {
        const mapped = toSnakeObj(s);
        mapped.doctor_id = newDoc.id;
        return mapped;
      });
      const { error: slotErr } = await supabase.from('doctor_slots').insert(slotsToInsert);
      if (slotErr) throw slotErr;
    }
  }

  console.log('JK Hospital seed data successfully created in Supabase!');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
