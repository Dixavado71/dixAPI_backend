import prisma from '../../../infrastructure/database/prismaClient.js';

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
    },
  });
}

export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      company: true,
    },
  });
}

export async function createUser(userData) {
  return prisma.user.create({
    data: userData,
  });
}

export async function updateUserLastLogin(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { last_login_at: new Date() },
  });
}

export async function createRefreshToken(userId, token) {
  return prisma.refreshToken.create({
    data: {
      user_id: userId,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export default {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserLastLogin,
};
