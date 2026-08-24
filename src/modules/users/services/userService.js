import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as userRepository from '../repositories/userRepository.js';
import { hashPassword } from '../../../infrastructure/security/password.js';

export async function getAll(companyId, options) {
  return userRepository.findAll(companyId, options);
}

export async function getById(id, companyId) {
  const user = await userRepository.findById(id, companyId);
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function create(data) {
  const { password, ...userData } = data;
  
  const existing = await userRepository.findByEmail(data.email, data.company_id);
  if (existing) throw new ConflictError('Email already registered');
  
  const password_hash = await hashPassword(password);
  
  return userRepository.create({
    ...userData,
    password_hash,
  });
}

export async function update(id, data, companyId) {
  const user = await userRepository.findById(id, companyId);
  if (!user) throw new NotFoundError('User');
  
  if (data.email && data.email !== user.email) {
    const existing = await userRepository.findByEmail(data.email, companyId);
    if (existing) throw new ConflictError('Email already registered');
  }
  
  if (data.password) {
    const { password, ...userData } = data;
    const password_hash = await hashPassword(password);
    return userRepository.update(id, { ...userData, password_hash });
  }
  
  return userRepository.update(id, data);
}

export async function remove(id, companyId) {
  const user = await userRepository.findById(id, companyId);
  if (!user) throw new NotFoundError('User');
  return userRepository.remove(id);
}

export async function updateLastLogin(id) {
  return userRepository.updateLastLogin(id);
}

export default { getAll, getById, create, update, remove, updateLastLogin };
