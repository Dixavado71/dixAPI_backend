// Decisões puras do flow engine, extraídas de processIncomingMessage para
// permitir testes unitários sem dependências de banco/rede.

export function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Retorna o passo do trigger de maior prioridade (keyword mais longa) ou null.
export function matchTrigger(triggers, text) {
  const normalizedText = normalize(text);
  const sorted = Array.isArray(triggers)
    ? [...triggers].sort((a, b) => normalize(b.keyword).length - normalize(a.keyword).length)
    : [];
  return sorted.find((t) => normalizedText.includes(normalize(t.keyword))) ?? null;
}

// Detecta protocolo no formato MK-YYYYMMDD-XXXX (usado pelo step resume_by_protocol).
export function looksLikeProtocol(text) {
  return /^MK-[0-9]{8}-[A-F0-9]{4}$/.test(String(text || '').trim().toUpperCase());
}

// Classifica a resposta para um step 'question' por label ou value.
export function resolveQuestionOption(step, text) {
  if (!step?.options) return null;
  const normalizedText = normalize(text);
  return step.options.find(
    (o) => normalize(o.label) === normalizedText || normalize(o.value) === normalizedText,
  ) ?? null;
}

// Classifica a resposta do step 'action: cart_summary'.
export function classifyCartSummaryReply(text) {
  const normalizedText = normalize(text);
  if (/finaliz|confirmar|pedido|sim/.test(normalizedText)) return 'finish';
  if (/continuar|mais|comprar|voltar/.test(normalizedText)) return 'continue';
  return null;
}

// Classifica a resposta de um step 'product' (SIM / NÃO / inválida).
export function classifyProductReply(text) {
  const normalizedText = normalize(text);
  if (['sim', 's', 'yes', 'quero', 'comprar'].includes(normalizedText)) return 'sim';
  if (['nao', 'n', 'no', 'nao quero', 'nao, obrigado'].includes(normalizedText)) return 'nao';
  return null;
}

// Verifica se o texto parece uma quantidade válida (>= 1).
export function parseQuantity(text) {
  const qty = Number.parseInt(String(text ?? '').replace(/\D/g, ''), 10);
  return Number.isInteger(qty) && qty >= 1 ? qty : null;
}

// Palavras que resetam a sessão do bot.
export const RESET_KEYWORDS = ['menu', 'inicio', 'reiniciar', 'voltar', 'comecar', 'start', 'zerar'];

export function isResetKeyword(text) {
  return RESET_KEYWORDS.includes(normalize(text));
}

// Resolve o próximo step genérico (defaultStep) quando nada foi decidido.
export function resolveFallbackStep(steps, defaultStep) {
  return steps.find((s) => s.id === defaultStep) ?? steps[0] ?? null;
}

// Step 'resume_by_protocol' quando existe no fluxo (retomada por protocolo).
export function findResumeStep(steps) {
  return steps.find((s) => s.type === 'action' && s.action === 'resume_by_protocol') ?? null;
}

export default {
  normalize,
  matchTrigger,
  looksLikeProtocol,
  resolveQuestionOption,
  classifyCartSummaryReply,
  classifyProductReply,
  parseQuantity,
  RESET_KEYWORDS,
  isResetKeyword,
  resolveFallbackStep,
  findResumeStep,
};
