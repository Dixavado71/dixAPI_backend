import expressListEndpoints from 'express-list-endpoints';
import app from '../src/app.js';

export const routes = expressListEndpoints(app)
  .filter((r) => r.path.startsWith('/api/v1') || r.path === '/health')
  .map((r) => ({
    path: r.path,
    methods: r.methods.filter((m) => m !== 'OPTIONS' && m !== 'HEAD'),
    middlewares: r.middlewares,
  }));

export function routeByMethod(path, method) {
  return routes.find((r) => r.path === path && r.methods.includes(method));
}

export default { routes, routeByMethod };