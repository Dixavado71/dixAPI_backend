import { ForbiddenError } from '../../../shared/errors/AppError.js';

const roleHierarchy = {
  admin: ['admin', 'manager', 'operator'],
  manager: ['manager', 'operator'],
  operator: ['operator'],
};

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`));
    }
    
    next();
  };
}

export function checkRolePermission(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User not authenticated'));
    }
    
    const userRole = req.user.role;
    const allowedRoles = roleHierarchy[requiredRole] || [requiredRole];
    
    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(`Insufficient permissions. Required role: ${requiredRole}`));
    }
    
    next();
  };
}

export default authorize;
