import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { verifyAccessToken } from '../../security/jwt.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }
    
    const decoded = verifyAccessToken(token);
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      companyId: decoded.companyId,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return next(new UnauthorizedError('Token expired'));
    }
    if (error.message === 'Invalid token') {
      return next(new UnauthorizedError('Invalid token'));
    }
    next(error);
  }
}

export default authenticate;
