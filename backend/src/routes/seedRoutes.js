import express from 'express';
import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Seed 3 doctors
router.post('/doctors', async (req, res) => {
  try {
    // Create user accounts for doctors (if not already created)
    const doctors = [
      { name: 'Dr. Viji', email: 'viji@jkhospital.com', password: 'Doctor@123', specialty: 'Cardiologist' },
      { name: 'Dr. Jahan', email: 'jahan@jkhospital.com', password: 'Doctor@123', specialty: 'Neurologist' },
      { name: 'Dr. Sugu', email: 'sugu@jkhospital.com', password: 'Doctor@123', specialty: 'Dermatologist' }
    ];

    const hashedPassword = await bcrypt.hash('Doctor@123', 12);

    // Check if doctors already exist
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', doctors.map(d => d.email));

    if (existingUsers?.length > 0) {
      return res.json({ message: 'Doctors already exist', count: existingUsers.length });
    }

    // Create users
    const { error: userError } = await supabase.from('users').insert(
      doctors.map(d => ({
        name: d.name,
        email: d.email,
        password: hashedPassword,
        role: 'doctor',
        is_verified: true,
        phone: '9876543210'
      }))
    );

    if (userError) throw userError;

    // Create doctor records
    const { error: doctorError } = await supabase.from('doctors').insert([
      {
        name: 'Dr. Viji',
        specialty: 'Cardiologist',
        email: 'viji@jkhospital.com',
        department: 'Cardiology',
        experience: 15,
        qualification: 'MBBS, MD',
        bio: 'Heart disease specialist with 15 years of experience'
      },
      {
        name: 'Dr. Jahan',
        specialty: 'Neurologist',
        email: 'jahan@jkhospital.com',
        department: 'Neurology',
        experience: 12,
        qualification: 'MBBS, MD',
        bio: 'Brain specialist with 12 years of experience'
      },
      {
        name: 'Dr. Sugu',
        specialty: 'Dermatologist',
        email: 'sugu@jkhospital.com',
        department: 'Dermatology',
        experience: 10,
        qualification: 'MBBS, MD',
        bio: 'Skin specialist with 10 years of experience'
      }
    ]);

    if (doctorError) throw doctorError;

    res.json({ success: true, message: '3 doctors seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
