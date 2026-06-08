import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase, toSnakeObj } from '../config/supabase.js';

dotenv.config();

const hashPassword = async (pwd) => {
  return bcrypt.hash(pwd, 12);
};

const staffSeedAccounts = [
  ['admin@jkhospital.com', 'JK Hospital Admin', 'Admin@123', 'admin'],
  ['receptionist@jkhospital.com', 'JK Hospital Receptionist', 'Reception@123', 'receptionist'],
  ['pharmacist@jkhospital.com', 'JK Hospital Pharmacist', 'Pharmacy@123', 'pharmacist'],
  ['viji@jkhospital.com', 'Dr. Vijayakumar', 'Doctor@123', 'doctor'],
  ['jahan@jkhospital.com', 'Dr. Jahajeevan', 'Doctor@123', 'doctor'],
  ['sugu@jkhospital.com', 'Dr. Suguna', 'Doctor@123', 'doctor']
];

const run = async () => {
  console.log('Checking and inserting staff accounts if they do not exist...');
  for (const [email, name, password, role] of staffSeedAccounts) {
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Staff account ${email} already exists.`);
    } else {
      const hashedPassword = await hashPassword(password);
      const { data, error } = await supabase
        .from('users')
        .insert(toSnakeObj({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          isVerified: true
        }))
        .select('*');
      if (error) {
        console.error(`Error inserting ${email}:`, error);
      } else {
        console.log(`Inserted staff account ${email} with role ${role}.`);
      }
    }
  }
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
