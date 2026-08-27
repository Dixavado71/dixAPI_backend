import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

function resolveImport(baseDir, importPath, depth = 0) {
  let candidate = path.resolve(baseDir, importPath);
  if (!existsSync(candidate)) {
    for (const ext of ['.js', '/index.js']) {
      const withExt = candidate.endsWith('.js') ? candidate : candidate + ext;
      if (existsSync(withExt)) return withExt;
    }
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      const idx = path.join(candidate, 'index.js');
      if (existsSync(idx)) return idx;
    }
    return null;
  }
  if (statSync(candidate).isDirectory()) {
    const idx = path.join(candidate, 'index.js');
    return existsSync(idx) ? idx : null;
  }
  return candidate;
}

function followReexport(filePath, depth = 0) {
  if (depth > 4 || !filePath) return filePath;
  const content = readFileSync(filePath, 'utf8');
  const re = /from\s+'\.\/routes\/index\.js'/;
  if (re.test(content)) {
    const routesFile = path.resolve(path.dirname(filePath), 'routes/index.js');
    return existsSync(routesFile) ? routesFile : filePath;
  }
  return filePath;
}

function extractRoutes(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const routes = [];
  const methodRe = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = methodRe.exec(content)) !== null) {
    routes.push({ method: match[1], path: match[2] });
  }
  return routes;
}

function buildSwagger() {
  const routesIndex = readFileSync(path.join(SRC, 'routes/index.js'), 'utf8');

  const imports = {};
  for (const line of routesIndex.split('\n')) {
    const imp = line.match(/^import\s+(?:{?\s*(\w+)\s*}?)\s+from\s+'([^']+)';\s*$/);
    if (imp) {
      const resolved = resolveImport(path.join(SRC, 'routes'), imp[2]);
      if (resolved) imports[imp[1]] = followReexport(resolved);
    }
  }

  const mounts = [];
  const mountRe = /router\.use\('\/?([^']+)'\s*,\s*(\w+)\)/g;
  let match;
  while ((match = mountRe.exec(routesIndex)) !== null) {
    mounts.push({ prefix: match[1], routerName: match[2] });
  }

  const paths = {};
  const operationIds = new Set();
  for (const { prefix, routerName } of mounts) {
    const filePath = imports[routerName];
    if (!filePath) continue;
    let routes;
    try {
      routes = extractRoutes(filePath);
    } catch {
      continue;
    }
    for (const { method, path: routePath } of routes) {
      const fullPath = `/${prefix}${routePath === '/' ? '' : routePath}`;
      if (!paths[fullPath]) paths[fullPath] = {};
      const operationId = `${method}_${fullPath.replace(/[^a-zA-Z0-9]+/g, '_')}_${Object.keys(paths[fullPath]).length + 1}`;
      let safeId = operationId;
      let n = 2;
      while (operationIds.has(safeId)) safeId = `${operationId}_${n++}`;
      operationIds.add(safeId);
      paths[fullPath][method] = {
        operationId: safeId,
        summary: `${method.toUpperCase()} ${fullPath}`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Successo' },
          '400': { description: 'Requisição inválida' },
          '401': { description: 'Não autenticado' },
          '403': { description: 'Sem permissão' },
          '404': { description: 'Não encontrado' },
        },
      };
    }
  }

  const document = {
    openapi: '3.0.3',
    info: {
      title: 'DiixWhatsApp Backend API',
      description: 'API REST do DiixWhatsApp - Sistema multi-tenant de gestão de vendas, clientes, pedidos, delivery, WhatsApp, chatbot e automações. Documentação gerada a partir das rotas registradas.',
      version: '1.1.0',
      contact: { name: 'DiixWhatsApp Team', email: 'suporte@diixwhatsapp.com' },
    },
    servers: [
      { url: 'http://localhost:7171', description: 'Servidor de desenvolvimento' },
    ],
    tags: [
      { name: 'Auth' }, { name: 'Admin' }, { name: 'Users' }, { name: 'Companies' },
      { name: 'Products' }, { name: 'Customers' }, { name: 'Orders' }, { name: 'Catalog' },
      { name: 'Promotions' }, { name: 'Coupons' }, { name: 'Payments' }, { name: 'Delivery' },
      { name: 'Communications' }, { name: 'Consent' }, { name: 'Transactions' },
      { name: 'Billing' }, { name: 'Conversations' }, { name: 'Automation' },
      { name: 'Notifications' }, { name: 'WhatsApp' }, { name: 'Dashboard' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };

  const out = path.resolve(SRC, 'swagger.json');
  writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
  const totalOps = Object.values(paths).reduce((acc, p) => acc + Object.keys(p).length, 0);
  console.log(`swagger.json gerado: ${Object.keys(paths).length} paths, ${totalOps} operações (${SRC}/swagger.json)`);
}

buildSwagger();
