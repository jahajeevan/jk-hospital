import express from 'express';
import { supabase, toSnakeObj } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Seed 3 doctors into database
router.post('/doctors', asyncHandler(async (req, res) => {
  console.log('🌱 Starting doctor seeding endpoint...');
  
  const doctors = [
    { name: 'Dr. Viji', email: 'viji@jkhospital.com', specialty: 'Cardiology', department: 'Cardiology', experience: 15, qualification: 'MBBS, MD', bio: 'Heart disease specialist with 15 years of experience', fee: 500 },
    { name: 'Dr. Jahan', email: 'jahan@jkhospital.com', specialty: 'Neurology', department: 'Neurology', experience: 12, qualification: 'MBBS, MD', bio: 'Brain and nervous system specialist with 12 years of experience', fee: 500 },
    { name: 'Dr. Sugu', email: 'sugu@jkhospital.com', specialty: 'Dermatology', department: 'Dermatology', experience: 10, qualification: 'MBBS, MD', bio: 'Skin specialist with 10 years of experience', fee: 500 }
  ];

  try {
    const hashedPassword = await bcrypt.hash('Doctor@123', 12);

    // Check if doctors already exist by email
    const { data: existingDoctors, error: checkError } = await supabase
      .from('doctors')
      .select('id, email')
      .in('email', doctors.map(d => d.email));

    if (checkError) {
      console.warn('⚠️  Could not check existing doctors:', checkError.message);
    }

    console.log(`Found ${existingDoctors?.length || 0} existing doctors`);

    // Insert doctors that don't exist
    const seededDoctors = [];
    for (const doctor of doctors) {
      const exists = existingDoctors?.some(d => d.email === doctor.email);
      
      if (!exists) {
        const { data: inserted, error: insertError } = await supabase
          .from('doctors')
          .insert(toSnakeObj(doctor))
          .select('id');

        if (insertError) {
          console.warn(`⚠️  Could not insert doctor ${doctor.name}:`, insertError.message);
        } else {
          console.log(`✅ Seeded doctor: ${doctor.name}`);
          seededDoctors.push(doctor.name);
        }
      } else {
        console.log(`⊘ Doctor ${doctor.name} already exists`);
      }
    }

    // Try to create user accounts for doctors (optional - may fail if users already exist)
    for (const doctor of doctors) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', doctor.email.toLowerCase())
          .limit(1);

        if (!existingUser?.length) {
          await supabase
            .from('users')
            .insert(toSnakeObj({
              email: doctor.email.toLowerCase(),
              password: hashedPassword,
              name: doctor.name,
              role: 'doctor',
              isVerified: true,
              phone: '9876543210'
            }));
          console.log(`✅ Created user account for ${doctor.name}`);
        }
      } catch (userErr) {
        console.warn(`⚠️  Could not create user for ${doctor.name}:`, userErr.message);
      }
    }

    res.json({ 
      success: true, 
      message: `${seededDoctors.length} doctors seeded successfully`,
      doctors: seededDoctors
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to seed doctors',
      details: error
    });
  }
}));

export default router;
