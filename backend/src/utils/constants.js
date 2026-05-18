export const HOSPITAL = {
  name: 'JK Hospital',
  emergency: '7845265507',
  upiId: process.env.UPI_ID || 'jahajeevan@fam',
  consultationFee: Number(process.env.CONSULTATION_FEE || 500)
};

export const DOCTOR_SPECIALTIES = [
  ['Dr. Vijayakumar', 'Orthopedic Specialist'],
  ['Dr. Jahajeevan', 'Pediatric Specialist'],
  ['Dr. Suguna', 'General Physician']
];

