import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { json, error } from '@/lib/api/response';

const require = createRequire(import.meta.url);
const Joi = require('joi');
const User = require('../../backend/models/User');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  organization: Joi.string().max(100),
  country: Joi.string().max(50),
  phone: Joi.string().max(20),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

function signToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function register({ request }) {
  try {
    const body = await request.json();
    const { error: validationError, value } = registerSchema.validate(body);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }

    const { email, password, firstName, lastName, organization, country, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error('User already exists', 400);
    }

    const user = new User({
      email,
      password,
      profile: { firstName, lastName, organization, country, phone },
    });

    await user.save();

    return json(
      {
        message: 'User registered successfully',
        token: signToken(user),
        user: user.getPublicProfile(),
      },
      201
    );
  } catch (err) {
    console.error('Registration error:', err);
    return error('Registration failed', 500);
  }
}

export async function login({ request }) {
  try {
    const body = await request.json();
    const { error: validationError, value } = loginSchema.validate(body);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }

    const { email, password } = value;
    const user = await User.findOne({ email });
    if (!user) {
      return error('Invalid credentials', 401);
    }

    if (user.isLocked()) {
      return error('Account locked due to too many failed login attempts', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return error('Invalid credentials', 401);
    }

    await user.resetLoginAttempts();
    await user.updateOne({ lastLogin: new Date() });

    return json({
      message: 'Login successful',
      token: signToken(user),
      user: user.getPublicProfile(),
    });
  } catch (err) {
    console.error('Login error:', err);
    return error('Login failed', 500);
  }
}
