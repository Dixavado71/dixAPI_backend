// Módulo de administração de produtos para o dono da loja via WhatsApp.
// O dono gerencia produtos (criar, listar, editar, ativar/desativar) por conversa,
// incluindo envio de imagem para a foto do produto.
//
// Estado persistido no metadata do contato (chave `product_admin_state`).

import * as whatsappRepo from '../repositories/whatsappRepository.js';
import * as productService from '../../products/services/productService.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import { canonicalPhone } from '../../../shared/whatsapp/phone.js';

const ADMIN_STATE_KEY = 'product_admin_state';

function getState(contact) {
  return contact?.metadata?.[ADMIN_STATE_KEY] ?? null;
}

function withState(contact, state) {
  return { ...(contact?.metadata ?? {}), [ADMIN_STATE_KEY]: state };
}

function clearState(contact) {
  const meta = { ...(contact?.metadata ?? {}) };
  delete meta[ADMIN_STATE_KEY];
  return meta;
}

let syncConversation = () => {};
export function setSyncConversation(fn) { syncConversation = fn || (() => {}); }

// Verifica se o remetente é o dono da loja (ownerPhone ou atendentePhone).
export function isOwner(botConfig, from) {
  const owner = canonicalPhone(botConfig?.ownerPhone);
  const atendente = canonicalPhone(botConfig?.atendentePhone);
  const sender = canonicalPhone(from);
  return Boolean(sender && (sender === owner || sender === atendente));
}

async function sendMsg(number, to, text) {
  if (!text) return;
  await evolutionApi.sendText(number.external_account_id, to, text, 500).catch(() => null);
  await syncConversation({ companyId: number.company_id, from: to, content: text, sender: 'bot', messageType: 'text' }).catch(() => null);
}

async function persist(contact, meta) {
  if (contact?.id) await whatsappRepo.updateContactMetadata(contact.id, meta).catch(() => null);
}

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

async function listProductsForOwner(companyId, number, from) {
  const products = await productService.listAllProducts(companyId).catch(() => []);
  if (products.length === 0) {
    await sendMsg(number, from, '📦 Nenhum produto cadastrado ainda. Digite *criar* para adicionar o primeiro.');
    return;
  }
  const lines = products.map((p, i) => `${i + 1}. ${p.name} — ${formatMoney(p.price)} (est: ${p.stock}) ${p.status === 'inactive' ? '[inativo]' : ''}`).join('\n');
  await sendMsg(number, from, `📦 *Produtos (${products.length}):*\n\n${lines}\n\nDigite o número para editar ou *criar* para adicionar.`);
  return products;
}

// Retorna true se a mensagem foi tratada pelo modo dono (não segue para o bot).
export async function handleOwnerMessage({ companyId, number, from, text, media, contact }) {
  const state = getState(contact);
  const raw = text ?? '';
  const normalized = raw.trim().toLowerCase();

  // Imagem recebida: define a foto do produto (se estiver aguardando) ou informa o menu.
  if (media?.url) {
    if (state?.step === 'awaiting_image') {
      const data = { ...state.data, imageUrl: media.url };
      await persist(contact, clearState(contact));
      try {
        const product = await productService.createProduct(companyId, data);
        await sendMsg(number, from, `✅ *${product.name}* criado com sucesso!\n\n💰 ${formatMoney(product.price)}\n📦 Estoque: ${product.stock}\n🏷️ Categoria: ${product.category}\n🖼️ Com foto\n\nDigite *menu* para mais opções.`);
      } catch (err) {
        await sendMsg(number, from, `❌ Erro ao criar produto: ${err.message}`);
      }
      return true;
    }
    if (!state) {
      await sendMsg(number, from, '🖼️ Imagem recebida! Digite *criar* para adicionar um produto e envie a foto quando pedido, ou *menu* para as opções.');
      return true;
    }
  }

  // Sem estado ativo: comandos de nível superior.
  if (!state) {
    if (normalized === 'menu' || normalized === 'admin' || normalized === 'ajuda' || normalized === '1') {
      const menu = [
        '*👤 Admin de Produtos — Cestas da Samira*',
        '',
        '1. Listar produtos',
        '2. Criar produto',
        '3. Ajuda',
        '0. Sair do admin',
        '',
        'Digite o número da opção.',
      ].join('\n');
      await sendMsg(number, from, menu);
      return true;
    }
    if (normalized === '2' || normalized === 'criar' || normalized === 'novo') {
      await persist(contact, withState(contact, { step: 'awaiting_name', data: {} }));
      await sendMsg(number, from, '📝 *Nome do produto:*\n\nDigite o nome do novo produto.');
      return true;
    }
    if (normalized === '3') {
      await sendMsg(number, from, 'Comandos:\n\n*menu* — abre o painel\n*criar* — novo produto\n*número* — edita o produto correspondente\n*sair* — sai do admin\n\nDurante o cadastro, envie uma foto quando solicitado para definir a imagem do produto.');
      return true;
    }
    if (normalized === '0' || normalized === 'sair') {
      return false; // cai para o bot normal
    }
    // Se parece número, tenta selecionar produto para edição.
    const idx = Number.parseInt(normalized, 10);
    if (Number.isInteger(idx) && idx > 0) {
      const products = await productService.listAllProducts(companyId).catch(() => []);
      const target = products[idx - 1];
      if (target) {
        await persist(contact, withState(contact, { step: 'edit_menu', data: { productId: target.id, name: target.name } }));
        const menu = [
          `*Editando: ${target.name}*`,
          '',
          '1. Renomear',
          '2. Alterar descrição',
          '3. Alterar preço',
          '4. Alterar estoque',
          '5. Alterar categoria',
          '6. Alterar foto (envie uma imagem)',
          '7. Ativar/Desativar',
          '8. Excluir',
          '0. Voltar ao menu',
          '',
          'Digite o número da ação.',
        ].join('\n');
        await sendMsg(number, from, menu);
        return true;
      }
    }
    return false; // outras mensagens vão para o bot normal
  }

  // ===== Fluxo de CRIAR produto =====
  if (state.step === 'awaiting_name') {
    await persist(contact, withState(contact, { step: 'awaiting_description', data: { ...state.data, name: raw } }));
    await sendMsg(number, from, '📝 *Descrição:*\n\nDigite a descrição ou *pular* para deixar em branco.');
    return true;
  }
  if (state.step === 'awaiting_description') {
    const description = normalized === 'pular' ? null : raw;
    await persist(contact, withState(contact, { step: 'awaiting_price', data: { ...state.data, description } }));
    await sendMsg(number, from, '💰 *Preço:*\n\nDigite o valor (ex.: 89,90).');
    return true;
  }
  if (state.step === 'awaiting_price') {
    const price = Number(raw.replace(',', '.').replace(/[^\d.]/g, ''));
    if (Number.isNaN(price) || price <= 0) {
      await sendMsg(number, from, '❌ Preço inválido. Digite apenas números (ex.: 89,90).');
      return true;
    }
    await persist(contact, withState(contact, { step: 'awaiting_stock', data: { ...state.data, price } }));
    await sendMsg(number, from, '📦 *Estoque:*\n\nQuantas unidades? (número inteiro)');
    return true;
  }
  if (state.step === 'awaiting_stock') {
    const stock = Number.parseInt(raw, 10);
    if (Number.isNaN(stock) || stock < 0) {
      await sendMsg(number, from, '❌ Estoque inválido. Digite um número inteiro (ex.: 20).');
      return true;
    }
    await persist(contact, withState(contact, { step: 'awaiting_category', data: { ...state.data, stock } }));
    await sendMsg(number, from, '🏷️ *Categoria:*\n\nDigite a categoria (ex.: cestas, brindes, bebidas) ou *pular*.');
    return true;
  }
  if (state.step === 'awaiting_category') {
    const category = normalized === 'pular' ? 'geral' : raw;
    await persist(contact, withState(contact, { step: 'awaiting_image', data: { ...state.data, category } }));
    await sendMsg(number, from, '🖼️ *Foto (opcional):*\n\nEnvie uma imagem agora ou digite *pular* para seguir sem foto.');
    return true;
  }
  if (state.step === 'awaiting_image') {
    const imageUrl = media?.url || null;
    const data = { ...state.data, imageUrl: imageUrl ?? state.data.imageUrl ?? null };
    await persist(contact, clearState(contact));
    try {
      const product = await productService.createProduct(companyId, data);
      await sendMsg(number, from, `✅ *${product.name}* criado com sucesso!\n\n💰 ${formatMoney(product.price)}\n📦 Estoque: ${product.stock}\n🏷️ Categoria: ${product.category}${product.imageUrl ? '\n🖼️ Com foto' : ''}\n\nDigite *menu* para mais opções.`);
    } catch (err) {
      await sendMsg(number, from, `❌ Erro ao criar produto: ${err.message}`);
    }
    return true;
  }

  // ===== Fluxo de EDITAR produto =====
  if (state.step === 'edit_menu') {
    const id = state.data?.productId;
    const action = normalized;
    if (action === '0' || action === 'voltar') {
      await persist(contact, clearState(contact));
      await sendMsg(number, from, 'Voltando ao menu. Digite *menu* para as opções.');
      return true;
    }
    if (!id) {
      await persist(contact, clearState(contact));
      await sendMsg(number, from, '❌ Produto não identificado. Digite *menu*.');
      return true;
    }
    const stepMap = {
      '1': 'edit_name',
      '2': 'edit_description',
      '3': 'edit_price',
      '4': 'edit_stock',
      '5': 'edit_category',
      '6': 'edit_image',
      '7': 'edit_toggle',
      '8': 'edit_delete',
    };
    const nextStep = stepMap[action];
    if (!nextStep) {
      await sendMsg(number, from, '❌ Opção inválida. Digite um número de 0 a 8.');
      return true;
    }
    if (nextStep === 'edit_image') {
      await persist(contact, withState(contact, { step: 'edit_image', data: state.data }));
      await sendMsg(number, from, '🖼️ Envie a nova foto do produto (ou *pular* para manter a atual).');
      return true;
    }
    if (nextStep === 'edit_toggle') {
      try {
        const current = await productService.getProduct(companyId, id);
        const nextStatus = current.status === 'active' ? 'inactive' : 'active';
        await productService.updateProduct(companyId, id, { status: nextStatus });
        await sendMsg(number, from, `✅ Produto *${current.name}* ${nextStatus === 'active' ? 'ativado' : 'desativado'}.`);
      } catch (err) {
        await sendMsg(number, from, `❌ Erro: ${err.message}`);
      }
      await persist(contact, clearState(contact));
      return true;
    }
    if (nextStep === 'edit_delete') {
      try {
        await productService.deleteProduct(companyId, id);
        await sendMsg(number, from, '🗑️ Produto excluído.');
      } catch (err) {
        await sendMsg(number, from, `❌ Não foi possível excluir: ${err.message}`);
      }
      await persist(contact, clearState(contact));
      return true;
    }
    const prompts = {
      edit_name: 'Digite o novo *nome*:',
      edit_description: 'Digite a nova *descrição* (ou *pular* para limpar):',
      edit_price: 'Digite o novo *preço* (ex.: 129,90):',
      edit_stock: 'Digite o novo *estoque* (número inteiro):',
      edit_category: 'Digite a nova *categoria*:',
    };
    await persist(contact, withState(contact, { step: nextStep, data: state.data }));
    await sendMsg(number, from, prompts[nextStep]);
    return true;
  }

  if (state.step === 'edit_name') {
    try { await productService.updateProduct(companyId, state.data.productId, { name: raw }); await sendMsg(number, from, '✅ Nome atualizado.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }
  if (state.step === 'edit_description') {
    const description = normalized === 'pular' ? null : raw;
    try { await productService.updateProduct(companyId, state.data.productId, { description }); await sendMsg(number, from, '✅ Descrição atualizada.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }
  if (state.step === 'edit_price') {
    const price = Number(raw.replace(',', '.').replace(/[^\d.]/g, ''));
    if (Number.isNaN(price) || price <= 0) { await sendMsg(number, from, '❌ Preço inválido.'); return true; }
    try { await productService.updateProduct(companyId, state.data.productId, { price }); await sendMsg(number, from, '✅ Preço atualizado.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }
  if (state.step === 'edit_stock') {
    const stock = Number.parseInt(raw, 10);
    if (Number.isNaN(stock) || stock < 0) { await sendMsg(number, from, '❌ Estoque inválido.'); return true; }
    try { await productService.updateProduct(companyId, state.data.productId, { stock }); await sendMsg(number, from, '✅ Estoque atualizado.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }
  if (state.step === 'edit_category') {
    try { await productService.updateProduct(companyId, state.data.productId, { category: raw }); await sendMsg(number, from, '✅ Categoria atualizada.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }
  if (state.step === 'edit_image') {
    const imageUrl = media?.url || null;
    try { await productService.updateProduct(companyId, state.data.productId, { imageUrl }); await sendMsg(number, from, '✅ Foto atualizada.'); }
    catch (err) { await sendMsg(number, from, `❌ Erro: ${err.message}`); }
    await persist(contact, clearState(contact));
    return true;
  }

  return false;
}

export default { isOwner, handleOwnerMessage, setSyncConversation };