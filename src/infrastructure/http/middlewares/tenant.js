import { ForbiddenError } from '../../../shared/errors/AppError.js';

export function ensureTenant() {
  return (req, res, next) => {
    if (!req.user || !req.user.companyId) {
      return next(new ForbiddenError('Company context not found'));
    }
    
    req.tenant = {
      companyId: req.user.companyId,
    };
    
    next();
  };
}

export default ensureTenant;
