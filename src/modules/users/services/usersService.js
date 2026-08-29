import { NotFoundError, ConflictError, ForbiddenError } from '../../../shared/errors/AppError.js';
import * as repo from '../repositories/usersRepository.js';
import { hashPassword } from '../../../infrastructure/security/password.js';

const STORE_ROLES = ['admin', 'manager', 'operator'];

function mapUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatar_url,
    role: u.role,
    isActive: u.is_active,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
    membership: u.UserCompany?.[0] ?? null,
  };
}

function canManage(requestedRole, actorRole) {
  if (actorRole === 'admin') return STORE_ROLES.includes(requestedRole);
  if (actorRole === 'manager') return requestedRole === 'operator';
  return false;
}

export async function listUsers(companyId, filters) {
  const users = await repo.listUsers(companyId, filters);
  return users.map(mapUser);
}

export async function createUser(companyId, actorRole, data) {
  if (!canManage(data.role, actorRole)) {
    throw new ForbiddenError('Você não tem permissão para criar usuários com este papel.');
  }
  const existing = await repo.findUserByEmail(companyId, data.email);
  if (existing) throw new ConflictError('E-mail já cadastrado nesta loja.');

  const passwordHash = await hashPassword(data.password);
  const user = await repo.createUser({
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    avatar_url: data.avatarUrl ?? null,
    password_hash: passwordHash,
    role: data.role,
    is_active: data.isActive ?? true,
    language: data.language ?? 'pt-BR',
    timezone: data.timezone ?? 'America/Sao_Paulo',
  });

  await repo.createMembership({
    user_id: user.id,
    company_id: companyId,
    role: data.role,
    is_primary: true,
    status: data.isActive === false ? 'inactive' : 'active',
    joined_at: new Date(),
  });

  return findUserById(companyId, user.id);
}

export async function updateUser(companyId, actorRole, actorId, id, data) {
  const user = await repo.findUserById(companyId, id);
  if (!user) throw new NotFoundError('Usuário não encontrado.');

  const targetRole = data.role ?? user.role;
  if (!canManage(targetRole, actorRole)) {
    throw new ForbiddenError('Você não tem permissão para gerenciar usuários com este papel.');
  }

  if (data.isActive === false && id === actorId) {
    throw new ForbiddenError('Você não pode desativar a si mesmo.');
  }

  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  if (data.role !== undefined) patch.role = data.role;
  if (data.language !== undefined) patch.language = data.language;
  if (data.timezone !== undefined) patch.timezone = data.timezone;

  await repo.updateUser(companyId, id, patch);

  const membershipPatch = {};
  if (data.role !== undefined) membershipPatch.role = data.role;
  if (data.isActive !== undefined) membershipPatch.status = data.isActive ? 'active' : 'inactive';
  if (Object.keys(membershipPatch).length > 0) {
    await repo.updateMembership(companyId, id, membershipPatch);
  }

  return findUserById(companyId, id);
}

export async function removeUser(companyId, actorRole, actorId, id) {
  const user = await repo.findUserById(companyId, id);
  if (!user) throw new NotFoundError('Usuário não encontrado.');
  if (actorRole !== 'admin') throw new ForbiddenError('Apenas administradores podem remover usuários.');
  if (!canManage(user.role, actorRole)) {
    throw new ForbiddenError('Você não tem permissão para remover este usuário.');
  }
  if (id === actorId) {
    throw new ForbiddenError('Você não pode remover a si mesmo.');
  }

  await repo.updateUser(companyId, id, { is_active: false });
  await repo.updateMembership(companyId, id, { status: 'inactive', removed_at: new Date() });
  return { deleted: true };
}

export async function findUserById(companyId, id) {
  const user = await repo.findUserById(companyId, id);
  if (!user) throw new NotFoundError('Usuário não encontrado.');
  return mapUser(user);
}

export default { listUsers, createUser, updateUser, removeUser, findUserById };