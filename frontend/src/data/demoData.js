export const doctors = [
  {
    _id: 'doc-vijay',
    name: 'Dr Ravi Kumar',
    email: 'ravi@jkhospital.com',
    specialty: 'Orthopedic Specialist',
    specialization: 'Orthopedics',
    qualification: 'MBBS, MS Ortho',
    department: 'Orthopedics',
    experience: '14 years',
    bio: 'Precision orthopedic care for trauma recovery, sports injuries, and joint mobility.',
    fee: 500,
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
    slots: [
      { _id: 'v1', label: 'Morning OP', startTime: '09:00', endTime: '11:00', tokenLimit: 25, bookedTokens: 0, fee: 500 },
      { _id: 'v2', label: 'Afternoon OP', startTime: '15:00', endTime: '17:00', tokenLimit: 25, bookedTokens: 0, fee: 500 },
      { _id: 'v3', label: 'Evening OP', startTime: '19:00', endTime: '20:00', tokenLimit: 15, bookedTokens: 0, fee: 500 }
    ]
  },
  {
    _id: 'doc-jaha',
    name: 'Dr Priya Sharma',
    email: 'priya@jkhospital.com',
    specialty: 'Pediatric Specialist',
    specialization: 'Pediatrics',
    qualification: 'MBBS, MD Pediatrics',
    department: 'Pediatrics',
    experience: '11 years',
    bio: 'Gentle pediatric care focused on child health, immunization, and family guidance.',
    fee: 500,
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=600&q=80',
    slots: [
      { _id: 'j1', label: 'Morning Pediatrics', startTime: '09:00', endTime: '12:00', tokenLimit: 25, bookedTokens: 0, fee: 500 },
      { _id: 'j2', label: 'Afternoon Pediatrics', startTime: '15:00', endTime: '17:00', tokenLimit: 25, bookedTokens: 0, fee: 500 },
      { _id: 'j3', label: 'Night Pediatrics', startTime: '19:00', endTime: '23:00', tokenLimit: 30, bookedTokens: 0, fee: 500 }
    ]
  },
  {
    _id: 'doc-suguna',
    name: 'Dr Arjun Menon',
    email: 'arjun@jkhospital.com',
    specialty: 'General Physician',
    specialization: 'General Medicine',
    qualification: 'MBBS, DNB Family Medicine',
    department: 'General Medicine',
    experience: '18 years',
    bio: 'Trusted primary care for fever, preventive screening, and chronic condition follow-up.',
    fee: 500,
    isAvailable: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
    slots: [
      { _id: 's1', label: 'Morning General OP', startTime: '10:00', endTime: '12:00', tokenLimit: 25, bookedTokens: 0, fee: 500 },
      { _id: 's2', label: 'Evening General OP', startTime: '17:00', endTime: '22:00', tokenLimit: 35, bookedTokens: 0, fee: 500 }
    ]
  }
];

export const demoAppointments = [
  {
    _id: 'apt-1',
    doctor: doctors[1],
    appointmentDate: new Date().toISOString(),
    slotLabel: 'Child Wellness',
    tokenNumber: 10,
    queuePosition: 10,
    estimatedWaitMinutes: 72,
    status: 'confirmed',
    patientDetails: { name: 'Demo Patient', age: 8, gender: 'Male', phone: '7845265507', symptoms: 'Fever and cough' },
    payment: { amount: 500, transactionId: 'JKH-DEMO-001', status: 'success', upiId: 'jahajeevan@fam' },
    invoiceNumber: 'INV-DEMO-001'
  }
];

export const testimonials = [
  ['Clear token flow, kind staff, and almost no waiting-room confusion.', 'R. Anitha'],
  ['The pediatric consultation was calm, quick, and beautifully organized.', 'K. Prakash'],
  ['I booked, paid, and downloaded my invoice before reaching the hospital.', 'S. Meera']
];

export const galleryImages = [
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=900&q=80'
];
