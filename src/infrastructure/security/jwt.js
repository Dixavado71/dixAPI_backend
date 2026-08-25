import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export function generateAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: 'HS256',
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    expiresIn: env.jwtAccessExpiresIn,
  });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    algorithm: 'HS256',
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    jwtid: crypto.randomUUID(),
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwtRefreshSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}
