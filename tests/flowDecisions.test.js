import { describe, it, expect } from 'vitest';
import {
  normalize, matchTrigger, looksLikeProtocol, resolveQuestionOption,
  classifyCartSummaryReply, classifyProductReply, parseQuantity,
  isResetKeyword, findResumeStep, resolveFallbackStep,
} from '../src/modules/automation/services/flowDecisions.js';

describe('flowDecisions — normalize', () => {
  it('trims, lowercases and removes accents', () => {
    expect(normalize('  Olá Mundo!  ')).toBe('ola mundo!');
    expect(normalize('CAFÉ')).toBe('cafe');
    expect(normalize('')).toBe('');
  });
});

describe('flowDecisions — matchTrigger', () => {
  const triggers = [
    { keyword: 'bom dia', step: 'welcome' },
    { keyword: 'ola', step: 'welcome' },
    { keyword: 'atendente', step: 'human' },
  ];

  it('matches keyword in text', () => {
    expect(matchTrigger(triggers, 'bom dia')).toMatchObject({ keyword: 'bom dia', step: 'welcome' });
    expect(matchTrigger(triggers, 'Quero falar com atendente')).toMatchObject({ keyword: 'atendente', step: 'human' });
  });

  it('prioritizes longer keyword when both match', () => {
    const result = matchTrigger(triggers, 'bom dia, quero atendente');
    expect(result.step).toBe('human'); // 'quero atendente' matches 'atendente', not 'bom dia'
  });

  it('returns null when no match', () => {
    expect(matchTrigger(triggers, 'tchau')).toBeNull();
  });

  it('handles empty triggers', () => {
    expect(matchTrigger([], 'ola')).toBeNull();
  });
});

describe('flowDecisions — looksLikeProtocol', () => {
  it('matches MK-YYYYMMDD-XXXX format', () => {
    expect(looksLikeProtocol('MK-20260830-ABCD')).toBe(true);
    expect(looksLikeProtocol('mk-20260830-abcd')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(looksLikeProtocol('INVALID')).toBe(false);
    expect(looksLikeProtocol('')).toBe(false);
  });
});

describe('flowDecisions — resolveQuestionOption', () => {
  const step = {
    options: [
      { label: 'Ver cestas', value: 'cestas', next: 'listaCestas' },
      { label: 'Sair', value: 'sair', next: 'fim' },
    ],
  };

  it('matches by label (case/acento insensitive)', () => {
    expect(resolveQuestionOption(step, 'VER CESTAS')).toMatchObject({ value: 'cestas' });
    expect(resolveQuestionOption(step, 'sair')).toMatchObject({ value: 'sair' });
  });

  it('matches by value', () => {
    expect(resolveQuestionOption(step, 'cestas')).toMatchObject({ label: 'Ver cestas' });
  });

  it('returns null when no option matches', () => {
    expect(resolveQuestionOption(step, 'tchau')).toBeNull();
  });

  it('returns null for step without options', () => {
    expect(resolveQuestionOption({}, 'oi')).toBeNull();
  });
});

describe('flowDecisions — classifyCartSummaryReply', () => {
  it('detects finish', () => {
    expect(classifyCartSummaryReply('finalizar')).toBe('finish');
    expect(classifyCartSummaryReply('sim')).toBe('finish');
    expect(classifyCartSummaryReply('confirmar pedido')).toBe('finish');
  });

  it('detects continue', () => {
    expect(classifyCartSummaryReply('continuar')).toBe('continue');
    expect(classifyCartSummaryReply('comprar mais')).toBe('continue');
  });

  it('returns null for unknown', () => {
    expect(classifyCartSummaryReply('tchau')).toBeNull();
  });
});

describe('flowDecisions — classifyProductReply', () => {
  it('detects sim', () => {
    expect(classifyProductReply('sim')).toBe('sim');
    expect(classifyProductReply('quero')).toBe('sim');
    expect(classifyProductReply('comprar')).toBe('sim');
  });

  it('detects nao', () => {
    expect(classifyProductReply('nao')).toBe('nao');
    expect(classifyProductReply('não')).toBe('nao');
    expect(classifyProductReply('nao, obrigado')).toBe('nao');
  });

  it('returns null for unknown', () => {
    expect(classifyProductReply('talvez')).toBeNull();
  });
});

describe('flowDecisions — parseQuantity', () => {
  it('parses valid number', () => {
    expect(parseQuantity('2')).toBe(2);
    expect(parseQuantity('10')).toBe(10);
  });

  it('rejects zero', () => {
    expect(parseQuantity('0')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });
});

describe('flowDecisions — isResetKeyword', () => {
  it('detects reset keywords', () => {
    expect(isResetKeyword('menu')).toBe(true);
    expect(isResetKeyword('INICIO')).toBe(true);
    expect(isResetKeyword('reiniciar')).toBe(true);
    expect(isResetKeyword('voltar')).toBe(true);
  });

  it('rejects non-reset words', () => {
    expect(isResetKeyword('produto')).toBe(false);
    expect(isResetKeyword('')).toBe(false);
  });
});

describe('flowDecisions — findResumeStep', () => {
  it('finds the resume_by_protocol step', () => {
    const steps = [
      { id: 's1', type: 'action', action: 'transfer_to_human' },
      { id: 's2', type: 'action', action: 'resume_by_protocol' },
    ];
    expect(findResumeStep(steps)).toMatchObject({ id: 's2' });
  });

  it('returns null when no resume step', () => {
    expect(findResumeStep([{ id: 's1', type: 'message' }])).toBeNull();
  });
});

describe('flowDecisions — resolveFallbackStep', () => {
  it('finds by defaultStep id', () => {
    const steps = [{ id: 's1' }, { id: 's2' }];
    expect(resolveFallbackStep(steps, 's2')).toMatchObject({ id: 's2' });
  });

  it('falls back to first step', () => {
    const steps = [{ id: 's1' }, { id: 's2' }];
    expect(resolveFallbackStep(steps, 'inexistente')).toMatchObject({ id: 's1' });
  });

  it('returns null when no steps', () => {
    expect(resolveFallbackStep([], 's1')).toBeNull();
  });
});