import nodemailer from 'nodemailer';
import type { SmtpConfig } from './types.js';

export function createSmtpTransport(smtp: SmtpConfig) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.tls === 'implicit',
    requireTLS: smtp.tls === 'starttls',
    ignoreTLS: smtp.tls === 'none',
    tls: { rejectUnauthorized: true, ...(smtp.servername ? { servername: smtp.servername } : {}) },
    ...(smtp.auth ? { auth: smtp.auth } : {}),
    connectionTimeout: smtp.timeouts?.connection ?? 10_000,
    greetingTimeout: smtp.timeouts?.greeting ?? 10_000,
    socketTimeout: smtp.timeouts?.socket ?? 30_000,
    dnsTimeout: smtp.timeouts?.dns ?? 10_000,
    pool: false,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true
  });
}
