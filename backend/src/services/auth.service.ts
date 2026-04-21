import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { JwtAccessPayload, JwtRefreshPayload, UserRole } from '../types';

const BCRYPT_ROUNDS = 12;

// ─── Token generation ─────────────────────────────────────────────────────────

export function generateAccessToken(userId: string, email: string, role: UserRole): string {
  const payload: JwtAccessPayload = { sub: userId, email, role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(userId: string): string {
  const payload: JwtRefreshPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role?: UserRole
) {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });

  const accessToken = generateAccessToken(user.id as string, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id as string);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  // Select passwordHash explicitly (it's hidden by default with select: false)
  const user = await User.findOne({ email }).select('+passwordHash').lean();

  if (!user) {
    // Use generic message to prevent user enumeration
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(
    (user._id as { toString(): string }).toString(),
    user.email,
    user.role
  );
  const refreshToken = generateRefreshToken((user._id as { toString(): string }).toString());

  return {
    user: {
      id: (user._id as { toString(): string }).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

// ─── Refresh token ────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string) {
  let payload: JwtRefreshPayload;

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
  }

  const accessToken = generateAccessToken(
    (user._id as { toString(): string }).toString(),
    user.email,
    user.role
  );

  return { accessToken };
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return {
    id: (user._id as { toString(): string }).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
