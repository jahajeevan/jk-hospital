export const ROLES = Object.freeze({
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist',
  STAFF: 'staff'
});

export const PERMISSIONS = Object.freeze({
  USERS_READ: 'users:read',
  DOCTORS_MANAGE: 'doctors:manage',
  APPOINTMENTS_READ_ALL: 'appointments:read:all',
  APPOINTMENTS_MANAGE: 'appointments:manage',
  PAYMENTS_READ: 'payments:read',
  REFUNDS_MANAGE: 'refunds:manage',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  MEDICAL_RECORDS_READ: 'medical-records:read',
  MEDICAL_RECORDS_WRITE: 'medical-records:write',
  PHARMACY_INVENTORY_MANAGE: 'pharmacy-inventory:manage'
});

export const rolePermissions = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.APPOINTMENTS_READ_ALL,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE
  ],
  [ROLES.PHARMACIST]: [
    PERMISSIONS.APPOINTMENTS_READ_ALL,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
    PERMISSIONS.PHARMACY_INVENTORY_MANAGE
  ],
  [ROLES.DOCTOR]: [
    PERMISSIONS.APPOINTMENTS_READ_ALL,
    PERMISSIONS.MEDICAL_RECORDS_READ,
    PERMISSIONS.MEDICAL_RECORDS_WRITE
  ],
  [ROLES.STAFF]: [PERMISSIONS.APPOINTMENTS_READ_ALL, PERMISSIONS.NOTIFICATIONS_MANAGE],
  [ROLES.PATIENT]: []
};

export const hasPermission = (role, permission) => rolePermissions[role]?.includes(permission);

