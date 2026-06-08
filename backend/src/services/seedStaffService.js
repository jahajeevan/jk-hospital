import bcrypt from 'bcryptjs';
import { supabase, toSnakeObj } from '../config/supabase.js';

const SEED_STAFF = [
  {
    name: 'JK Hospital Admin',
    email: 'admin@jkhospital.com',
    password: 'Admin@123',
    phone: '7845265507',
    role: 'admin',
    isVerified: true,
    isActive: true
  },
  {
    name: 'JK Hospital Receptionist',
    email: 'receptionist@jkhospital.com',
    password: 'Reception@123',
    phone: '7845265508',
    role: 'receptionist',
    isVerified: true,
    isActive: true
  },
  {
    name: 'JK Hospital Pharmacist',
    email: 'pharmacist@jkhospital.com',
    password: 'Pharmacy@123',
    phone: '7845265509',
    role: 'pharmacist',
    isVerified: true,
    isActive: true
  }
];

const hashPassword = async (pwd) => {
  return bcrypt.hash(pwd, 12);
};

export const seedStaff = async () => {
  try {
    console.log('Seeding staff users (admin, receptionist, pharmacist)...');
    
    for (const staff of SEED_STAFF) {
      const hashedPassword = await hashPassword(staff.password);
      
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', staff.email.toLowerCase())
        .is('deleted_at', null)
        .limit(1);
      
      if (existingUsers?.length === 0) {
        const { error } = await supabase
          .from('users')
          .insert(toSnakeObj({
            ...staff,
            password: hashedPassword,
            email: staff.email.toLowerCase()
          }));
        
        if (error) {
          console.error(`Error seeding staff user ${staff.email}:`, error.message);
        } else {
          console.log(`✓ Seeded staff user: ${staff.email}`);
        }
      } else {
        console.log(`⊘ Staff user ${staff.email} already exists`);
      }
    }
    
    console.log('Staff seeding complete');
  } catch (error) {
    console.error('Error seeding staff:', error);
  }
};
