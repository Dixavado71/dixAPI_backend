import prisma from '../../../infrastructure/database/prismaClient.js';

export async function findAll(companyId, { skip, take, search, role, isActive }) {
  const where = {
    company_id: companyId,
  };
  
  if (role) {
    where.role = role;
  }
  
  if (isActive !== undefined) {
    where.is_active = isActive;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        company_id: true,
        name: true,
        email: true,
        phone: true,
        avatar_url: true,
        role: true,
        language: true,
        timezone: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  
  return { users, total };
}

export async function findById(id, companyId) {
  return prisma.user.findFirst({
    where: {
      id,
      company_id: companyId,
    },
    select: {
      id: true,
      company_id: true,
      name: true,
      email: true,
      phone: true,
      avatar_url: true,
      role: true,
      language: true,
      timezone: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
    },
  });
}

export async function findByEmail(email, companyId) {
  return prisma.user.findFirst({
    where: {
      email,
      company_id: companyId,
    },
  });
}

export async function create(data) {
  return prisma.user.create({ 
    data,
    select: {
      id: true,
      company_id: true,
      name: true,
      email: true,
      phone: true,
      avatar_url: true,
      role: true,
      language: true,
      timezone: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
    },
  });
}

export async function update(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      company_id: true,
      name: true,
      email: true,
      phone: true,
      avatar_url: true,
      role: true,
      language: true,
      timezone: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
    },
  });
}

export async function remove(id) {
  return prisma.user.delete({
    where: { id },
  });
}

export async function updateLastLogin(id) {
  return prisma.user.update({
    where: { id },
    data: { last_login_at: new Date() },
  });
}

export default {
  findAll,
  findById,
  findByEmail,
  create,
  update,
  remove,
  updateLastLogin,
};
