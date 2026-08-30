import { describe, it, expect } from 'vitest';
import { canonicalPhone, cleanPhone } from '../src/shared/whatsapp/phone.js';

describe('canonicalPhone', () => {
  it('strips non-digits', () => {
    expect(canonicalPhone('+55 61 99589-9954')).toBe('61995899954');
  });

  it('strips leading 55 from 13-digit BR numbers', () => {
    expect(canonicalPhone('5561995899954')).toBe('61995899954');
    expect(canonicalPhone('5561999999999')).toBe('61999999999');
  });

  it('keeps 11-digit numbers unchanged', () => {
    expect(canonicalPhone('6195899994')).toBe('6195899994');
    expect(canonicalPhone('11999999999')).toBe('11999999999');
  });

  it('handles numbers with DDI from other countries (12 digits)', () => {
    expect(canonicalPhone('5511999999999')).toBe('11999999999'); // 13 digits starts with 55
    expect(canonicalPhone('34612345678')).toBe('34612345678'); // Spain 12 digits, no change
  });

  it('handles JID suffixes', () => {
    expect(canonicalPhone('5561995899954@s.whatsapp.net')).toBe('61995899954');
    expect(canonicalPhone('61995899954@c.us')).toBe('61995899954');
  });

  it('handles empty/null', () => {
    expect(canonicalPhone('')).toBe('');
    expect(canonicalPhone(null)).toBe('');
    expect(canonicalPhone(undefined)).toBe('');
  });

  it('matches Kaled number case (whitelist vs stored)', () => {
    const whitelist = ['5561995899954', '66838561699'];
    const connectedNumber = '61995899954';
    const canonicalWhitelist = whitelist.map(canonicalPhone);
    const canonicalConnected = canonicalPhone(connectedNumber);
    expect(canonicalWhitelist).toContain(canonicalConnected);
    expect(canonicalPhone('66838561699')).toBe('66838561699');
  });
});