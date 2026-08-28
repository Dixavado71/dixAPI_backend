import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateExpression } from '../src/modules/automation/services/expressionEvaluator.js';
import { fillTemplate } from '../src/modules/automation/services/templateEngine.js';

const repository = {
  findFlowById: vi.fn(),
  findActiveFlowByType: vi.fn(),
  incrementMessagesCount: vi.fn(),
  listFlows: vi.fn(),
  createFlow: vi.fn(),
};

vi.mock('../src/modules/automation/repositories/automationRepository.js', () => repository);
const automationService = await import('../src/modules/automation/services/automationService.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('expression evaluator (sandbox)', () => {
  it('evaluates equality and string methods', () => {
    expect(evaluateExpression("ctx.nome == 'Maria'", { ctx: { nome: 'Maria' } })).toBe(true);
    expect(evaluateExpression("ctx.mensagem.includes('entrega')", { ctx: { mensagem: 'qual o prazo de entrega?' } })).toBe(true);
    expect(evaluateExpression("ctx.email.endsWith('@empresa.com')", { ctx: { email: 'a@empresa.com' } })).toBe(true);
  });

  it('evaluates logic, comparison and ternary', () => {
    expect(evaluateExpression("ctx.nome == 'Maria' && ctx.valor >= 100", { ctx: { nome: 'Maria', valor: 150 } })).toBe(true);
    expect(evaluateExpression('ctx.valor > 100 ? true : false', { ctx: { valor: 50 } })).toBe(false);
    expect(evaluateExpression("ctx.canal == 'site' || ctx.canal == 'whatsapp'", { ctx: { canal: 'whatsapp' } })).toBe(true);
  });

  it('supports regex literal with match()', () => {
    expect(evaluateExpression('ctx.mensagem.match(/pedido/i)', { ctx: { mensagem: 'meu PEDIDO chegou?' } })).toBe(true);
    expect(evaluateExpression('ctx.mensagem.match(/entrega/i)', { ctx: { mensagem: 'qual o valor?' } })).toBe(false);
  });

  it('supports string methods and arithmetic', () => {
    expect(evaluateExpression("ctx.texto.trim() == 'oi'", { ctx: { texto: '  oi ' } })).toBe(true);
    expect(evaluateExpression('ctx.a + ctx.b > 10', { ctx: { a: 5, b: 6 } })).toBe(true);
  });

  it('blocks unsafe property access', () => {
    expect(() => evaluateExpression('ctx.nome.constructor', { ctx: { nome: 'x' } })).toThrow();
    expect(() => evaluateExpression('ctx.nome.__proto__', { ctx: { nome: 'x' } })).toThrow();
    expect(() => evaluateExpression('process.exit()', { ctx: {} })).toThrow();
  });

  it('returns false for empty or invalid expressions', () => {
    expect(evaluateExpression('', { ctx: {} })).toBe(false);
    expect(evaluateExpression('   ', { ctx: {} })).toBe(false);
  });
});

describe('template engine', () => {
  it('fills variables and leaves unknown untouched', () => {
    expect(fillTemplate('Olá {nome}, pedido {pedido}', { nome: 'Maria', pedido: '#1' })).toBe('Olá Maria, pedido #1');
    expect(fillTemplate('Oi {nome}', {})).toBe('Oi {nome}');
  });

  it('returns non-strings unchanged', () => {
    expect(fillTemplate(null, {})).toBeNull();
    expect(fillTemplate(123, {})).toBe(123);
  });

  it('resolves nested paths like {vars.nome}', () => {
    expect(fillTemplate('Olá {vars.nome}!', { vars: { nome: 'Maria' } })).toBe('Olá Maria!');
    expect(fillTemplate('{a.b.c}', { a: { b: { c: 7 } } })).toBe('7');
    expect(fillTemplate('{vars.inexistente}', { vars: {} })).toBe('{vars.inexistente}');
  });
});

describe('flow service', () => {
  it('duplicates an existing flow as inactive', async () => {
    repository.findFlowById.mockResolvedValue({ id: 'f1', name: 'Vendas', type: 'vendas', description: null, icon_emoji: null, is_active: true, config_json: { steps: [{ id: 's1', type: 'message', content: 'oi' }] } });
    repository.createFlow.mockImplementation((data) => Promise.resolve({ id: 'f2', ...data }));
    const result = await automationService.duplicateFlow('c1', 'f1');
    expect(repository.createFlow).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vendas (cópia)', is_active: false }));
    expect(result.id).toBe('f2');
  });

  it('simulates a flow with variables and conditions', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'variable', variable: 'nome', mode: 'input', next: 's2' },
          { id: 's2', type: 'message', content: 'Olá {nome}!', next: 's3' },
          { id: 's3', type: 'condition', expression: "ctx.valor > 100", next: 's4', next_false: 's5' },
          { id: 's4', type: 'message', content: 'Vip' },
          { id: 's5', type: 'message', content: 'Regular' },
        ],
      },
    });
    const result = await automationService.testFlow('c1', 'f1', { vars: { nome: 'Maria', valor: 150 }, stepId: 's1' });
    expect(result.executed.map((e) => e.type)).toEqual(['variable', 'message', 'condition', 'message']);
    expect(result.executed[1].content).toBe('Olá Maria!');
  });

  it('throws when flow does not exist', async () => {
    repository.findFlowById.mockResolvedValue(null);
    await expect(automationService.getFlowById('c1', 'missing')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('validates a flow with product and cart steps', () => {
    expect(() => automationService.validateFlowConfig({
      steps: [
        { id: 's1', type: 'catalog', style: 'cards', limit: 5, next: 's2' },
        { id: 's2', type: 'product', productSource: 'featured', askQuantity: true, next_sim: 's3', next_nao: 's4' },
        { id: 's3', type: 'action', action: 'cart_summary', next: 's5', next_nao: 's1' },
        { id: 's4', type: 'message', content: 'ok' },
        { id: 's5', type: 'action', action: 'cart_checkout', paymentMethod: 'pix' },
      ],
      defaultStep: 's1',
    })).not.toThrow();
  });

  it('rejects a product step without product or source', () => {
    expect(() => automationService.validateFlowConfig({
      steps: [{ id: 's1', type: 'product' }],
    })).toThrow(/produto precisa de um produto ou origem/);
  });

  it('rejects dangling next_sim/next_nao references', () => {
    expect(() => automationService.validateFlowConfig({
      steps: [{ id: 's1', type: 'product', productSource: 'catalog', next_sim: 'inexistente' }],
    })).toThrow(/next_sim/);
  });

  it('simulates a flow with a product step', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'product', productSource: 'featured', next_sim: 's2', next_nao: 's3' },
          { id: 's2', type: 'message', content: 'Adicionado!' },
          { id: 's3', type: 'message', content: 'Ok, sem produto.' },
        ],
      },
    });
    const result = await automationService.testFlow('c1', 'f1', { stepId: 's1' });
    expect(result.executed.map((e) => e.type)).toEqual(['product', 'message']);
  });
});
