export function requireWebhookSecret(secret, message = 'Segredo do webhook inválido.') {
  return (req, res, next) => {
    if (!secret) return next();
    const provided = req.headers['x-webhook-secret'];
    if (!provided || provided !== secret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message } });
    }
    return next();
  };
}

export default requireWebhookSecret;