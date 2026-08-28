import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporter = null;

function getTransporter() {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const tr = getTransporter();
  if (!tr) return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  await tr.sendMail({ from: env.mailFrom, to, subject, text, html });
  return { sent: true };
}

export default { sendMail };
