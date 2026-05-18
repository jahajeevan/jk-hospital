import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import RefundRequest from '../models/RefundRequest.js';
import User from '../models/User.js';

dotenv.config();

const slots = [
  { label: 'Morning Care', startTime: '09:00', endTime: '11:00', tokenLimit: 18, fee: 500 },
  { label: 'Afternoon Clinic', startTime: '13:00', endTime: '15:00', tokenLimit: 16, fee: 500 },
  { label: 'Evening Review', startTime: '17:00', endTime: '19:00', tokenLimit: 14, fee: 600 }
];

await connectDB();

await Promise.all([
  Appointment.deleteMany(),
  Payment.deleteMany(),
  RefundRequest.deleteMany(),
  Notification.deleteMany(),
  Doctor.deleteMany(),
  User.deleteMany()
]);

await User.create([
  { name: 'JK Hospital Admin', email: 'admin@jkhospital.local', password: 'Admin@12345', role: 'admin', isVerified: true },
  { name: 'Demo Patient', email: 'patient@jkhospital.local', password: 'Patient@12345', phone: '7845265507', role: 'patient', isVerified: true }
]);

await Doctor.create([
  {
    name: 'Dr. Vijayakumar',
    specialty: 'Orthopedic Specialist',
    bio: 'Joint care, trauma recovery, sports injuries, and mobility restoration.',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
    slots
  },
  {
    name: 'Dr. Jahajeevan',
    specialty: 'Pediatric Specialist',
    bio: 'Child health, immunization, growth tracking, and acute pediatric care.',
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=600&q=80',
    slots
  },
  {
    name: 'Dr. Suguna',
    specialty: 'General Physician',
    bio: 'Primary care, preventive screening, fever care, and chronic condition follow-up.',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
    slots
  }
]);

console.log('JK Hospital seed data created');
process.exit(0);
