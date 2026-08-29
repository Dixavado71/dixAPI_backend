import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

await import('../src/config/env.js');

const evolutionApi = await import('../src/infrastructure/whatsapp/evolutionApiClient.js');

function mockResponse(data, ok = true) {
  return { ok, json: () => Promise.resolve(data) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('evolutionApiClient', () => {
  describe('createInstance', () => {
    it('sends correct payload to /instance/create', async () => {
      mockFetch.mockResolvedValue(mockResponse({ instance: { instanceName: 'test_inst' } }));
      const result = await evolutionApi.createInstance('test_inst', 'https://app.com/webhook/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/instance/create'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"instanceName":"test_inst"'),
        }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.integration).toBe('WHATSAPP-BAILEYS');
      expect(body.qrcode).toBe(true);
      expect(body.webhook.url).toBe('https://app.com/webhook/test');
      expect(result.instance.instanceName).toBe('test_inst');
    });
  });

  describe('sendText', () => {
    it('sends correct payload to /message/sendText', async () => {
      mockFetch.mockResolvedValue(mockResponse({ key: { id: 'msg1' } }));
      const result = await evolutionApi.sendText('inst1', '5511999999999', 'Olá', 1000);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/message/sendText/inst1'),
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.number).toBe('5511999999999');
      expect(body.text).toBe('Olá');
      expect(body.delay).toBe(1000);
      expect(result.key.id).toBe('msg1');
    });
  });

  describe('sendPtv', () => {
    it('uses field "video" not "ptv"', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));
      await evolutionApi.sendPtv('inst1', '5511999999999', 'https://exemplo.com/video.mp4', null, 800);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.video).toBe('https://exemplo.com/video.mp4');
      expect(body.ptv).toBeUndefined();
    });
  });

  describe('sendReaction', () => {
    it('sends correct key structure', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));
      await evolutionApi.sendReaction('inst1', '5511999999999', 'msg123', '👍', false);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.key.id).toBe('msg123');
      expect(body.key.remoteJid).toContain('@s.whatsapp.net');
      expect(body.key.fromMe).toBe(false);
      expect(body.reaction).toBe('👍');
    });
  });

  describe('sendPoll', () => {
    it('includes selectableCount', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));
      await evolutionApi.sendPoll('inst1', '5511999999999', 'Escolha', ['A', 'B', 'C']);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.selectableCount).toBeGreaterThanOrEqual(1);
      expect(body.values).toEqual(['A', 'B', 'C']);
    });
  });

  describe('sendList', () => {
    it('includes footerText', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));
      await evolutionApi.sendList('inst1', '5511999999999', 'Título', 'Descrição', 'Ver', [], 1000);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.footerText).toBeDefined();
    });
  });

  describe('markMessageAsRead', () => {
    it('sends readMessages array', async () => {
      mockFetch.mockResolvedValue(mockResponse({}));
      await evolutionApi.markMessageAsRead('inst1', '5511999999999', 'msg123');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(Array.isArray(body.readMessages)).toBe(true);
      expect(body.readMessages[0].id).toBe('msg123');
    });
  });

  describe('getWebhook', () => {
    it('uses GET method', async () => {
      mockFetch.mockResolvedValue(mockResponse({ webhook: { url: 'https://app.com' } }));
      await evolutionApi.getWebhook('inst1');
      expect(mockFetch.mock.calls[0][1].method).toBe('GET');
    });
  });
});