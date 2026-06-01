import { body } from 'express-validator';

export const bookingRules = [
  body('doctorId').isUUID(),
  body('slotId').isUUID(),
  body('appointmentDate').isISO8601(),
  body('patientDetails.name').trim().isLength({ min: 2 }),
  body('patientDetails.age').isInt({ min: 0, max: 120 }),
  body('patientDetails.gender').isIn(['Female', 'Male', 'Other']),
  body('patientDetails.phone').trim().isLength({ min: 8 }),
  body('patientDetails.symptoms').trim().isLength({ min: 2 })
];

