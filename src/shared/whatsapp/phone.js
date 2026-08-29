export function cleanPhone(jid) {
  return String(jid).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '').replace(/[^\d]/g, '');
}

export function normalizePhone(phone) {
  return String(phone).replace('@c.us', '').replace('@s.whatsapp.net', '');
}

export function jidFromPhone(phone) {
  if (!phone) return null;
  const p = String(phone);
  if (p.includes('@')) return p;
  if (p.endsWith('@g.us') || p.endsWith('@s.whatsapp.net') || p.endsWith('@c.us') || p.endsWith('@lid')) return p;
  return `${p}@s.whatsapp.net`;
}

export function resolveContactName(contact) {
  if (!contact) return null;
  if (contact.name) return contact.name;
  if (contact.metadata && typeof contact.metadata === 'object') {
    const meta = contact.metadata;
    if (meta.name) return meta.name;
  }
  return null;
}

export default { cleanPhone, normalizePhone, jidFromPhone, resolveContactName };