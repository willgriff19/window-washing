import nodemailer from 'nodemailer';

export interface JobEmailData {
  to: string[];
  subject: string;
  html: string;
}

export async function sendJobEmail({ to, subject, html }: JobEmailData) {
  if (!process.env.SMTP_SERVER || !process.env.SMTP_PORT || !process.env.SENDER_EMAIL || !process.env.SENDER_PASSWORD) {
    throw new Error('SMTP environment variables are not fully set');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to: to.join(','),
    subject,
    html,
  });
} 