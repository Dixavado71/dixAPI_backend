import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-min-32-characters-long!!';

export function signToken({ id = 'user-1', email = 'admin@demo.com', companyId = 'company-1', role = 'admin' } = {}) {
  return jwt.sign(
    { id, email, companyId, role },
    SECRET,
    { expiresIn: '15m', issuer: 'dixapi', audience: 'dixapi-api' },
  );
}

export const adminToken = () => signToken({ role: 'admin' });
export const managerToken = () => signToken({ role: 'manager' });
export const operatorToken = () => signToken({ role: 'operator', email: 'op@demo.com', id: 'user-2' });
export const masterToken = () => signToken({ role: 'master', id: 'master-1', companyId: null });
export const resellerToken = () => signToken({ role: 'reseller', id: 'reseller-1', companyId: null });

export default { signToken, adminToken, managerToken, operatorToken, masterToken, resellerToken };