import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const User = require('../../backend/models/User');
import { error } from './response';

export function getToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function authenticate(request) {
  const token = getToken(request);
  if (!token) {
    return { response: error('Access token required', 401) };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return { response: error('Invalid token', 401) };
    }
    if (!user.isActive) {
      return { response: error('Account deactivated', 401) };
    }
    if (user.isLocked()) {
      return { response: error('Account locked', 401) };
    }

    return { user };
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return { response: error('Invalid token', 401) };
    }
    if (err.name === 'TokenExpiredError') {
      return { response: error('Token expired', 401) };
    }
    return { response: error('Authentication error', 500) };
  }
}

export async function optionalAuth(request) {
  const token = getToken(request);
  if (!token) return { user: null };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.isActive && !user.isLocked()) {
      return { user };
    }
  } catch {
    // continue without auth
  }
  return { user: null };
}

export function requireRoles(user, roles) {
  if (!user) {
    return error('Authentication required', 401);
  }
  if (!roles.includes(user.role)) {
    return error('Insufficient permissions', 403);
  }
  return null;
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
