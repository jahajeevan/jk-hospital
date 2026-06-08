import { supabase } from '../config/supabase.js';

const SEED_DOCTORS = [
  {
    id: 'doc-viji-001',
    name: 'Dr. Viji',
    specialty: 'Cardiology',
    department: 'Cardiology',
    experience: 15,
    qualification: 'MBBS, MD',
    bio: 'Heart disease specialist with 15 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'viji@jkhospital.com',
    phone: '9876543210'
  },
  {
    id: 'doc-jahan-001',
    name: 'Dr. Jahan',
    specialty: 'Neurology',
    department: 'Neurology',
    experience: 12,
    qualification: 'MBBS, MD',
    bio: 'Brain and nervous system specialist with 12 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'jahan@jkhospital.com',
    phone: '9876543211'
  },
  {
    id: 'doc-sugu-001',
    name: 'Dr. Sugu',
    specialty: 'Dermatology',
    department: 'Dermatology',
    experience: 10,
    qualification: 'MBBS, MD',
    bio: 'Skin specialist with 10 years of experience',
    fee: 500,
    is_available: true,
    avatar: null,
    email: 'sugu@jkhospital.com',
    phone: '9876543212'
  }
];

/**
 * Seed doctors into Supabase on app startup
 * This ensures the hardcoded doctors are always in the database
 */
export const seedDoctors = async () => {
  try {
    console.log('🌱 Starting doctor seeding...');

    for (const doctor of SEED_DOCTORS) {
      try {
        // Check if doctor already exists
        const { data: existingDoctor, error: fetchError } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', doctor.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (expected for new doctors)
          throw fetchError;
        }

        if (existingDoctor) {
          // Doctor exists, update if needed
          const { error: updateError } = await supabase
            .from('doctors')
            .update(doctor)
            .eq('id', doctor.id);

          if (updateError) {
            console.warn(`⚠️  Could not update doctor ${doctor.name}:`, updateError.message);
          } else {
            console.log(`✅ Updated doctor: ${doctor.name}`);
          }
        } else {
          // Doctor doesn't exist, insert
          const { error: insertError } = await supabase
            .from('doctors')
            .insert([doctor]);

          if (insertError) {
            console.warn(`⚠️  Could not insert doctor ${doctor.name}:`, insertError.message);
          } else {
            console.log(`✅ Seeded doctor: ${doctor.name}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error seeding doctor ${doctor.name}:`, err.message);
      }
    }

    console.log('🌱 Doctor seeding complete!');
  } catch (err) {
    console.error('❌ Doctor seeding failed:', err.message);
    // Don't throw - allow app to start even if seeding fails
  }
};
