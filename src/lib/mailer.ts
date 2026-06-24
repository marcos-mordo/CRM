import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}) {
  const fromAddress = opts.from || process.env.SMTP_FROM || 'no-reply@example.com';
  const from = opts.fromName ? `${opts.fromName} <${fromAddress}>` : fromAddress;

  return transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments,
  });
}

export async function verifyMailer() {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
