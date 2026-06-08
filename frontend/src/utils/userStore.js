import { createSessionToken, hashPassword, verifyPassword } from './secureCrypto.js';
import { migratePlainKey, secureGet, secureSet } from './secureStore.js';

const USERS_KEY = 'jk_secure_users';
const SESSION_KEY = 'jk_session';

let usersCache = null;

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const staffSeedAccounts = [
  ['admin@jkhospital.com', 'JK Hospital Admin', 'Admin@123', 'admin'],
  ['receptionist@jkhospital.com', 'JK Hospital Receptionist', 'Reception@123', 'receptionist'],
  ['pharmacist@jkhospital.com', 'JK Hospital Pharmacist', 'Pharmacy@123', 'pharmacist'],
  ['viji@jkhospital.com', 'Dr. Vijayakumar', 'Doctor@123', 'doctor'],
  ['jahan@jkhospital.com', 'Dr. Jahajeevan', 'Doctor@123', 'doctor'],
  ['sugu@jkhospital.com', 'Dr. Suguna', 'Doctor@123', 'doctor']
];

const invalidateUsersCache = () => {
  usersCache = null;
};

export const initUserStore = async () => {
  if (usersCache?.length) return usersCache;
  await migratePlainKey('jk_local_users');
  const users = await secureGet(USERS_KEY, []);
  if (users.length) {
    const missingSeeds = staffSeedAccounts.filter(([email]) => !users.some((item) => normalizeEmail(item.email) === normalizeEmail(email)));
    const nextUsers = missingSeeds.length
      ? [
          ...users,
          ...(await Promise.all(missingSeeds.map(async ([email, name, password, role]) => ({
            email,
            name,
            phone: '',
            role,
            credentials: await hashPassword(password)
          }))))
        ]
      : users;
    if (missingSeeds.length) await secureSet(USERS_KEY, nextUsers);
    usersCache = nextUsers;
    return nextUsers;
  }

  const adminPass = import.meta.env.VITE_INITIAL_ADMIN_PASSWORD || 'Admin@12345';
  const patientPass = import.meta.env.VITE_INITIAL_PATIENT_PASSWORD || 'Patient@12345';

  const seeded = await Promise.all([
    {
      email: 'admin@jkhospital.local',
      name: 'JK Hospital Admin',
      phone: '',
      role: 'admin',
      credentials: await hashPassword(adminPass)
    },
    {
      email: 'patient@jkhospital.local',
      name: 'Demo Patient',
      phone: '7845265507',
      role: 'patient',
      credentials: await hashPassword(patientPass)
    },
    ...staffSeedAccounts.map(async ([email, name, password, role]) => ({
      email,
      name,
      phone: '',
      role,
      credentials: await hashPassword(password)
    }))
  ]);

  await secureSet(USERS_KEY, seeded);
  usersCache = seeded;
  return seeded;
};

export const listUsers = async () => {
  if (usersCache) return usersCache;
  usersCache = await initUserStore();
  return usersCache;
};

export const findUser = async (email) => {
  const users = await listUsers();
  return users.find((item) => normalizeEmail(item.email) === normalizeEmail(email));
};

export const registerUser = async ({ name, email, phone, password, role = 'patient' }) => {
  const users = await listUsers();
  const normalized = normalizeEmail(email);
  if (users.some((item) => normalizeEmail(item.email) === normalized)) {
    throw new Error('Email already registered');
  }
  const next = [
    ...users,
    {
      email: normalized,
      name: name?.trim() || normalized.split('@')[0],
      phone: phone || '',
      role,
      credentials: await hashPassword(password)
    }
  ];
  await secureSet(USERS_KEY, next);
  usersCache = next;
  return next.find((item) => item.email === normalized);
};

export const updateUserPassword = async (email, password) => {
  const users = await listUsers();
  const normalized = normalizeEmail(email);
  const next = await Promise.all(
    users.map(async (item) =>
      normalizeEmail(item.email) === normalized ? { ...item, credentials: await hashPassword(password) } : item
    )
  );
  await secureSet(USERS_KEY, next);
  usersCache = next;
};

export const authenticateUser = async (email, password) => {
  const user = await findUser(email);
  if (!user || !(await verifyPassword(password, user.credentials))) {
    throw new Error('Invalid email or password');
  }
  return user;
};

export const createUserSession = async (user) => {
  const token = `local-${createSessionToken()}`;
  const payload = {
    token,
    user: {
      id: `usr-${normalizeEmail(user.email)}`,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: true
    },
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  return payload;
};

export const readUserSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session?.token || session.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearUserSession = () => sessionStorage.removeItem(SESSION_KEY);
