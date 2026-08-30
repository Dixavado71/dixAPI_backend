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

  it('supports String() global and null-coalescing || (flow gate pattern)', () => {
    expect(evaluateExpression("String(ctx.mensagem || '').match(/bom dia|ola|oi/i)", { ctx: { mensagem: 'bom dia' } })).toBe(true);
    expect(evaluateExpression("String(ctx.mensagem || '').match(/cesta|quanto/i)", { ctx: { mensagem: 'quero uma cesta' } })).toBe(true);
    expect(evaluateExpression("String(ctx.mensagem || '').match(/bom dia|ola|oi/i)", { ctx: { mensagem: 'tchau' } })).toBe(false);
    expect(evaluateExpression("String(ctx.zm_resposta || '').toLowerCase().includes('atendente')", { ctx: { zm_resposta: 'Atendente' } })).toBe(true);
  });

  it('supports safe global helpers Number/Boolean/parseInt', () => {
    expect(evaluateExpression("Number(ctx.qtd) > 2", { ctx: { qtd: '5' } })).toBe(true);
    expect(evaluateExpression("Boolean(ctx.ativo)", { ctx: { ativo: 'sim' } })).toBe(true);
    expect(evaluateExpression("parseInt(ctx.ano, 10) == 2026", { ctx: { ano: '2026' } })).toBe(true);
  });

  it('|| keeps the operand value for defaulting (ctx.x || fallback)', () => {
    expect(evaluateExpression("String(ctx.nome || 'Visitante').includes('Ana')", { ctx: { nome: 'Ana' } })).toBe(true);
    expect(evaluateExpression("String(ctx.nome || 'Visitante').includes('Ana')", { ctx: {} })).toBe(false);
  });

  it('supports Math and Date safe globals', () => {
    expect(evaluateExpression('Math.round(ctx.valor) == 6', { ctx: { valor: 5.6 } })).toBe(true);
    expect(evaluateExpression('Math.floor(ctx.valor) == 5', { ctx: { valor: 5.9 } })).toBe(true);
    expect(evaluateExpression('Number.isFinite(ctx.valor)', { ctx: { valor: 10 } })).toBe(true);
    expect(evaluateExpression("ctx.cart.length > 0", { ctx: { cart: [1, 2] } })).toBe(true);
    expect(evaluateExpression('ctx.cart_total > 100', { ctx: { cart_total: 150.5 } })).toBe(true);
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

  it('simulates interactively step-by-step with client inputs', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'question', content: 'Escolha:', options: [{ label: 'Sim', value: 'sim', next: 's2' }, { label: 'Nao', value: 'nao', next: 's3' }] },
          { id: 's2', type: 'variable', variable: 'nome', mode: 'input', next: 's4' },
          { id: 's3', type: 'message', content: 'Saiu' },
          { id: 's4', type: 'message', content: 'Oi {nome}' },
        ],
      },
    });
    const result = await automationService.testFlow('c1', 'f1', { stepId: 's1', input: ['sim', 'Maria'] });
    expect(result.executed.map((e) => e.type)).toEqual(['question', 'variable', 'message']);
    expect(result.executed[2].content).toBe('Oi Maria');
  });

  it('detects a real loop in non-input steps', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'message', content: 'A', next: 's2' },
          { id: 's2', type: 'message', content: 'B', next: 's1' },
        ],
      },
    });
    const result = await automationService.testFlow('c1', 'f1', {});
    expect(result.loopDetected.length).toBeGreaterThan(0);
  });

  it('traverses a sub-flow via flow step', async () => {
    repository.findFlowById.mockImplementation((companyId, id) => {
      if (id === 'f2') {
        return Promise.resolve({
          id: 'f2',
          name: 'Sub',
          config_json: { defaultStep: 'x1', steps: [{ id: 'x1', type: 'message', content: 'sub ok' }] },
        });
      }
      return Promise.resolve({
        id: 'f1',
        config_json: {
          defaultStep: 's1',
          steps: [
            { id: 's1', type: 'flow', targetFlow: 'f2' },
          ],
        },
      });
    });
    const result = await automationService.testFlow('c1', 'f1', {});
    const types = result.executed.map((e) => e.type);
    expect(types).toContain('__subflow__');
    expect(types).toContain('message');
    expect(result.executed[result.executed.length - 1].content).toBe('sub ok');
  });

  it('captures free text when question has freeTextVariable', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'question', content: 'Endereco?', freeTextVariable: 'endereco', next: 's2', options: [{ label: 'Atendente', value: 'atendente', next: 's3' }] },
          { id: 's2', type: 'message', content: 'Entrega em {endereco}' },
          { id: 's3', type: 'message', content: 'humano' },
        ],
      },
    });
    const result = await automationService.testFlow('c1', 'f1', { stepId: 's1', input: ['Rua das Flores 100'] });
    expect(result.executed[1].content).toBe('Entrega em Rua das Flores 100');
  });

  it('warns on potential infinite loops between non-input steps', () => {
    const result = automationService.validateFlowConfig({
      steps: [
        { id: 's1', type: 'message', content: 'A', next: 's2' },
        { id: 's2', type: 'message', content: 'B', next: 's1' },
      ],
      defaultStep: 's1',
    });
    expect(result).toEqual(expect.objectContaining({ valid: true, warnings: expect.any(Array) }));
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('duplicateFlow remaps step references to new ids', async () => {
    repository.findFlowById.mockResolvedValue({
      id: 'f1',
      name: 'Vendas',
      type: 'vendas',
      description: null,
      icon_emoji: null,
      is_active: true,
      config_json: {
        defaultStep: 's1',
        triggers: [{ keyword: 'oi', step: 's1' }],
        steps: [
          { id: 's1', type: 'message', content: 'oi', next: 's2' },
          { id: 's2', type: 'question', content: '?', options: [{ label: 'Sim', value: 's', next: 's3' }] },
          { id: 's3', type: 'condition', expression: 'ctx.a == 1', next: 's1', next_false: 's3' },
        ],
      },
    });
    repository.createFlow.mockImplementation((data) => Promise.resolve({ id: 'f2', ...data }));
    const result = await automationService.duplicateFlow('c1', 'f1');
    const cfg = result.config_json;
    expect(cfg.steps[0].next).toBe('s2-copy');
    expect(cfg.steps[1].options[0].next).toBe('s3-copy');
    expect(cfg.steps[2].next).toBe('s1-copy');
    expect(cfg.defaultStep).toBe('s1-copy');
    expect(cfg.triggers[0].step).toBe('s1-copy');
  });
});
