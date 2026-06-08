import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const hashPassword = (pwd) => bcrypt.hash(pwd, 12);

async function seedDoctors() {
  try {
    console.log('🌱 Seeding 3 doctors...\n');

    const hashedPassword = await hashPassword('Doctor@123');

    // 1. Create users
    console.log('📝 Creating user accounts...');
    const { error: userError } = await supabase.from('users').insert([
      {
        name: 'Dr. Viji',
        email: 'viji@jkhospital.com',
        password: hashedPassword,
        role: 'doctor',
        is_verified: true,
        phone: '9876543210'
      },
      {
        name: 'Dr. Jahan',
        email: 'jahan@jkhospital.com',
        password: hashedPassword,
        role: 'doctor',
        is_verified: true,
        phone: '9876543211'
      },
      {
        name: 'Dr. Sugu',
        email: 'sugu@jkhospital.com',
        password: hashedPassword,
        role: 'doctor',
        is_verified: true,
        phone: '9876543212'
      }
    ]);

    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }
    console.log('✅ Users created\n');

    // 2. Create doctor records
    console.log('🏥 Creating doctor records...');
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
        bio: 'Brain and nervous system specialist with 12 years of experience'
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

    if (doctorError && !doctorError.message.includes('duplicate')) {
      throw doctorError;
    }
    console.log('✅ Doctors created\n');

    // 3. Verify
    console.log('🔍 Verifying...');
    const { data, error: verifyError } = await supabase.from('doctors').select('*');
    if (verifyError) throw verifyError;

    console.log(`✅ Success! Found ${data.length} doctors in database:`);
    data.forEach(d => console.log(`   - ${d.name} (${d.specialty})`));
    console.log('\n✨ Doctors seeded successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedDoctors();
