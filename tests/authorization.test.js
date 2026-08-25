import { describe, expect, it, vi } from 'vitest';
import { authorize, checkRolePermission } from '../src/infrastructure/http/middlewares/authorize.js';

function run(middleware, user) {
  const next = vi.fn();
  middleware({ user }, {}, next);
  return next;
}

describe('authorization middleware', () => {
  it('rejects a role outside the allowed set', () => {
    const next = run(authorize('admin'), { role: 'operator' });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('allows an explicitly authorized tenant role', () => {
    const next = run(authorize('admin', 'manager'), { role: 'manager' });
    expect(next).toHaveBeenCalledWith();
  });

  it('applies the configured role hierarchy', () => {
    const next = run(checkRolePermission('manager'), { role: 'viewer' });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }));
  });
});
