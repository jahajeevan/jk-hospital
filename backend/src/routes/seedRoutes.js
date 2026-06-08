import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Seed 3 doctors (simplified - returns success without Supabase write)
router.post('/doctors', asyncHandler(async (req, res) => {
  console.log('🌱 Doctor seeding requested');
  
  // Return success with default doctors
  // Note: These doctors are already available as fallback in frontend
  const seededDoctors = [
    { name: 'Dr. Viji', email: 'viji@jkhospital.com', specialty: 'Cardiology' },
    { name: 'Dr. Jahan', email: 'jahan@jkhospital.com', specialty: 'Neurology' },
    { name: 'Dr. Sugu', email: 'sugu@jkhospital.com', specialty: 'Dermatology' }
  ];

  res.json({ 
    success: true, 
    message: `3 doctors are now available`,
    doctors: seededDoctors
  });
}));

export default router;
