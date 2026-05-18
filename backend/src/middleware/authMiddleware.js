import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    const error = new Error('Please login again');
    error.statusCode = 401;
    throw error;
  }
  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.isActive) {
    const error = new Error('User not authorized');
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    const error = new Error('Insufficient permissions');
    error.statusCode = 403;
    return next(error);
  }
  next();
};
