import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep(PrismaClient);
export default prisma;