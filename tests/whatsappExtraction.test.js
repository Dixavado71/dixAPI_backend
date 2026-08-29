import { describe, it, expect } from 'vitest';
import { extractMessageText, extractMedia } from '../src/shared/whatsapp/extraction.js';

describe('extractMessageText', () => {
  it('extracts conversation text', () => {
    expect(extractMessageText({ conversation: 'olá' })).toBe('olá');
  });

  it('extracts extended text', () => {
    expect(extractMessageText({ extendedTextMessage: { text: 'boa tarde' } })).toBe('boa tarde');
  });

  it('extracts caption from media', () => {
    expect(extractMessageText({ imageMessage: { caption: 'foto do pedido' } })).toBe('foto do pedido');
    expect(extractMessageText({ videoMessage: { caption: 'vídeo' } })).toBe('vídeo');
  });

  it('extracts document title or file name', () => {
    expect(extractMessageText({ documentMessage: { title: 'contrato' } })).toBe('contrato');
    expect(extractMessageText({ documentMessage: { fileName: 'relatorio.pdf' } })).toBe('relatorio.pdf');
  });

  it('returns placeholders for audio/sticker/location/contact', () => {
    expect(extractMessageText({ audioMessage: {} })).toBe('🎵 Áudio');
    expect(extractMessageText({ stickerMessage: {} })).toBe('🖼️ Sticker');
    expect(extractMessageText({ locationMessage: {} })).toBe('📍 Localização');
    expect(extractMessageText({ contactMessage: { displayName: 'Ana' } })).toBe('👤 Ana');
  });

  it('extracts interactive button replies (SIM/NÃO)', () => {
    expect(extractMessageText({ buttonsResponseMessage: { selectedDisplayText: 'SIM' } })).toBe('SIM');
    expect(extractMessageText({ buttonsResponseMessage: { selectedButtonId: 'btn_1_NAO' } })).toBe('btn_1_NAO');
  });

  it('extracts list and template replies', () => {
    expect(extractMessageText({ listResponseMessage: { title: 'Finalizar pedido' } })).toBe('Finalizar pedido');
    expect(extractMessageText({ listResponseMessage: { singleSelectReply: { selectedRowId: 'cart_checkout' } } })).toBe('cart_checkout');
    expect(extractMessageText({ templateButtonReplyMessage: { selectedDisplayText: 'SIM' } })).toBe('SIM');
    expect(extractMessageText({ templateButtonReplyMessage: { selectedId: 'yes' } })).toBe('yes');
  });

  it('returns empty for null and fallback for unknown', () => {
    expect(extractMessageText(null)).toBe('');
    expect(extractMessageText({})).toBe('(mídia)');
  });
});

describe('extractMedia', () => {
  it('extracts image with url and caption', () => {
    expect(extractMedia({ imageMessage: { url: 'http://x/img.jpg', caption: 'foto', mimetype: 'image/jpeg' } })).toEqual({
      type: 'image', url: 'http://x/img.jpg', caption: 'foto', fileName: null, mimeType: 'image/jpeg',
    });
  });

  it('extracts document with file name', () => {
    expect(extractMedia({ documentMessage: { url: 'http://x/doc.pdf', fileName: 'doc.pdf', mimetype: 'application/pdf' } })).toEqual({
      type: 'document', url: 'http://x/doc.pdf', caption: null, fileName: 'doc.pdf', mimeType: 'application/pdf',
    });
  });

  it('extracts audio and sticker', () => {
    expect(extractMedia({ audioMessage: { url: 'http://x/a.mp3', mimetype: 'audio/mp3' } }).type).toBe('audio');
    expect(extractMedia({ stickerMessage: { url: 'http://x/s.webp' } }).type).toBe('sticker');
  });

  it('returns null when no media present', () => {
    expect(extractMedia({ conversation: 'texto' })).toBeNull();
    expect(extractMedia(null)).toBeNull();
  });

  it('extracts location without URL', () => {
    const result = extractMedia({ locationMessage: { degreesLatitude: -23.55, degreesLongitude: -46.63 } });
    expect(result.type).toBe('location');
    expect(result.caption).toBe('-23.55,-46.63');
    expect(result.url).toBeNull();
  });

  it('extracts contact with display name', () => {
    const result = extractMedia({ contactMessage: { displayName: 'Maria', vcard: 'BEGIN:VCARD...' } });
    expect(result.type).toBe('contact');
    expect(result.caption).toBe('Maria');
  });

  it('extracts poll with question and options', () => {
    const result = extractMedia({ pollCreationMessage: { name: 'Qual seu sabor?', options: [{ optionName: 'Chocolate' }, { optionName: 'Baunilha' }] } });
    expect(result.type).toBe('poll');
    expect(result.caption).toBe('Qual seu sabor?');
  });
});
