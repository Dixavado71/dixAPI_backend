const SAFE_STRING_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'toLowerCase', 'toUpperCase', 'trim', 'indexOf', 'match', 'replace', 'slice', 'split', 'substring', 'charAt', 'padStart', 'padEnd', 'concat']);

const SAFE_PROPS = new Set(['length']);

const SAFE_GLOBALS = new Set(['String', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Math', 'Date']);

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;

  function isRegexContext() {
    if (tokens.length === 0) return true;
    const last = tokens[tokens.length - 1];
    if (last.type === 'op' || last.type === 'lparen' || last.type === 'lbracket' || last.type === 'comma' || last.type === 'colon') return true;
    return false;
  }

  while (i < n) {
    const c = input[i];
    if (/\s/.test(c)) { i += 1; continue; }

    if (c === '/' && input[i + 1] !== '/' && input[i + 1] !== '*' && isRegexContext()) {
      let j = i + 1;
      let inClass = false;
      let escaped = false;
      while (j < n) {
        const ch = input[j];
        if (escaped) { escaped = false; j += 1; continue; }
        if (ch === '\\') { escaped = true; j += 1; continue; }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) break;
        j += 1;
      }
      const body = input.slice(i + 1, j);
      j += 1;
      let flags = '';
      while (j < n && /[a-z]/i.test(input[j])) { flags += input[j]; j += 1; }
      tokens.push({ type: 'regex', literal: new RegExp(body, flags) });
      i = j;
      continue;
    }

    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9._]/.test(input[j])) j += 1;
      tokens.push({ type: 'number', value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < n && input[j] !== c) {
        if (input[j] === '\\' && j + 1 < n) { s += input[j + 1]; j += 2; continue; }
        s += input[j];
        j += 1;
      }
      tokens.push({ type: 'string', value: s });
      i = j + 1;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (['==', '!=', '===', '!==', '<=', '>=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/%<>!?'.includes(c)) { tokens.push({ type: 'op', value: c }); i += 1; continue; }
    if (c === ':') { tokens.push({ type: 'colon' }); i += 1; continue; }
    if (c === '(') { tokens.push({ type: 'lparen' }); i += 1; continue; }
    if (c === ')') { tokens.push({ type: 'rparen' }); i += 1; continue; }
    if (c === '[') { tokens.push({ type: 'lbracket' }); i += 1; continue; }
    if (c === ']') { tokens.push({ type: 'rbracket' }); i += 1; continue; }
    if (c === ',') { tokens.push({ type: 'comma' }); i += 1; continue; }
    if (c === '.') { tokens.push({ type: 'dot' }); i += 1; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(input[j])) j += 1;
      tokens.push({ type: 'ident', value: input.slice(i, j) });
      i = j;
      continue;
    }

    throw new Error(`Caractere não permitido: ${c}`);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos]; }

  next() { const t = this.tokens[this.pos]; this.pos += 1; return t; }

  expect(type, value) {
    const t = this.next();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error('Expressão inválida');
    }
    return t;
  }

  parse() {
    const expr = this.parseTernary();
    if (this.peek().type !== 'eof') throw new Error('Expressão inválida');
    return expr;
  }

  parseTernary() {
    const test = this.parseOr();
    if (this.peek().type === 'op' && this.peek().value === '?') {
      this.next();
      const consequent = this.parseTernary();
      this.expect('colon');
      const alternate = this.parseTernary();
      return { type: 'ternary', test, consequent, alternate };
    }
    return test;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek().type === 'op' && this.peek().value === '||') {
      this.next();
      const right = this.parseAnd();
      left = { type: 'binary', op: '||', left, right };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseEquality();
    while (this.peek().type === 'op' && this.peek().value === '&&') {
      this.next();
      const right = this.parseEquality();
      left = { type: 'binary', op: '&&', left, right };
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.peek().type === 'op' && ['==', '!=', '===', '!=='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseRelational();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (this.peek().type === 'op' && ['<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'op' && ['+', '-'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.peek().type === 'op' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.peek().type === 'op' && this.peek().value === '!') {
      this.next();
      return { type: 'unary', op: '!', operand: this.parseUnary() };
    }
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.next();
      return { type: 'unary', op: '-', operand: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    while (true) {
      const t = this.peek();
      if (t.type === 'lparen' && expr.type === 'variable' && SAFE_GLOBALS.has(expr.name)) {
        this.next();
        const args = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseTernary());
          while (this.peek().type === 'comma') { this.next(); args.push(this.parseTernary()); }
        }
        this.expect('rparen');
        expr = { type: 'globalCall', name: expr.name, args };
      } else if (t.type === 'dot') {
        this.next();
        const name = this.expect('ident').value;
        if (this.peek().type === 'lparen') {
          this.next();
          const args = [];
          if (this.peek().type !== 'rparen') {
            args.push(this.parseTernary());
            while (this.peek().type === 'comma') { this.next(); args.push(this.parseTernary()); }
          }
          this.expect('rparen');
          expr = { type: 'call', callee: expr, name, args };
        } else {
          expr = { type: 'prop', object: expr, name };
        }
      } else if (t.type === 'lbracket') {
        this.next();
        const key = this.parseTernary();
        this.expect('rbracket');
        expr = { type: 'index', object: expr, key };
      } else {
        break;
      }
    }
    return expr;
  }

  parsePrimary() {
    const t = this.next();
    if (t.type === 'number') return { type: 'literal', value: t.value };
    if (t.type === 'string') return { type: 'literal', value: t.value };
    if (t.type === 'regex') return { type: 'literal', value: t.literal };
    if (t.type === 'ident') {
      if (t.value === 'true') return { type: 'literal', value: true };
      if (t.value === 'false') return { type: 'literal', value: false };
      if (t.value === 'null') return { type: 'literal', value: null };
      return { type: 'variable', name: t.value };
    }
    if (t.type === 'lparen') {
      const expr = this.parseTernary();
      this.expect('rparen');
      return expr;
    }
    if (t.type === 'lbracket') {
      const elements = [];
      if (this.peek().type !== 'rbracket') {
        elements.push(this.parseTernary());
        while (this.peek().type === 'comma') { this.next(); elements.push(this.parseTernary()); }
      }
      this.expect('rbracket');
      return { type: 'array', elements };
    }
    throw new Error('Expressão inválida');
  }
}

function getSafeProperty(object, name) {
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
    throw new Error('Acesso não permitido');
  }
  if (object === null || object === undefined) return undefined;
  return object[name];
}

function evaluate(node, ctx) {
  switch (node.type) {
    case 'literal':
      return node.value;
    case 'variable': {
      if (node.name === 'ctx') return ctx.ctx ?? ctx;
      if (node.name === 'Math') return Math;
      if (node.name === 'Date') return Date;
      if (node.name === 'String') return String;
      if (node.name === 'Number') return Number;
      if (node.name === 'Boolean') return Boolean;
      return ctx[node.name];
    }
    case 'prop': {
      const object = evaluate(node.object, ctx);
      if (object === null || object === undefined) return undefined;
      return getSafeProperty(object, node.name);
    }
    case 'index': {
      const object = evaluate(node.object, ctx);
      const key = evaluate(node.key, ctx);
      if (object === null || object === undefined) return undefined;
      return getSafeProperty(object, String(key));
    }
    case 'call': {
      const receiver = evaluate(node.callee, ctx);
      const name = node.name;
      if (typeof receiver === 'string') {
        if (!SAFE_STRING_METHODS.has(name)) throw new Error(`Função não permitida: ${name}`);
        const result = receiver[name].apply(receiver, node.args.map((a) => evaluate(a, ctx)));
        return name === 'match' ? Boolean(result) : result;
      }
      if (receiver === Math || receiver === Date || receiver === String || receiver === Number || receiver === Boolean) {
        const fn = receiver[name];
        if (typeof fn !== 'function') throw new Error(`Função não encontrada: ${name}`);
        return fn.apply(receiver, node.args.map((a) => evaluate(a, ctx)));
      }
      if (typeof receiver !== 'function') throw new Error(`Função não encontrada: ${name}`);
      const args = node.args.map((a) => evaluate(a, ctx));
      return receiver.apply(receiver, args);
    }
    case 'globalCall': {
      const name = node.name;
      const args = node.args.map((a) => evaluate(a, ctx));
      if (name === 'String') return String(args[0] ?? '');
      if (name === 'Number') return Number(args[0]);
      if (name === 'Boolean') return Boolean(args[0]);
      if (name === 'parseInt') return Number.parseInt(args[0], 10);
      if (name === 'parseFloat') return Number.parseFloat(args[0]);
      if (name === 'isNaN') return Number.isNaN(args[0]);
      if (name === 'isFinite') return Number.isFinite(args[0]);
      throw new Error(`Função não permitida: ${name}`);
    }
    case 'array':
      return node.elements.map((e) => evaluate(e, ctx));
    case 'unary': {
      const value = evaluate(node.operand, ctx);
      if (node.op === '!') return !value;
      if (node.op === '-') return -Number(value);
      return value;
    }
    case 'binary':
      return applyBinary(node.op, evaluate(node.left, ctx), evaluate(node.right, ctx));
    case 'ternary':
      return evaluate(node.test, ctx) ? evaluate(node.consequent, ctx) : evaluate(node.alternate, ctx);
    default:
      throw new Error('Nó de expressão desconhecido');
  }
}

function applyBinary(op, left, right) {
  switch (op) {
    case '&&': return left && right;
    case '||': return left || right;
    case '==': return left == right; // eslint-disable-line eqeqeq
    case '!=': return left != right; // eslint-disable-line eqeqeq
    case '===': return left === right;
    case '!==': return left !== right;
    case '<': return left < right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '>=': return left >= right;
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '%': return left % right;
    default: throw new Error(`Operador não suportado: ${op}`);
  }
}

export function evaluateExpression(expression, context = {}) {
  if (typeof expression !== 'string' || !expression.trim()) return false;
  const tokens = tokenize(expression);
  const ast = new Parser(tokens).parse();
  const result = evaluate(ast, context);
  return Boolean(result);
}

export function parseExpression(expression) {
  const tokens = tokenize(expression);
  return new Parser(tokens).parse();
}

export default { evaluateExpression, parseExpression };
