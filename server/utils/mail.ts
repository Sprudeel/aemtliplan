import nodemailer, { type Transporter } from "nodemailer";

interface Mail {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter === undefined) {
    const url = process.env.SMTP_URL?.trim();
    transporter = url ? nodemailer.createTransport(url) : null;
  }
  return transporter;
}

/** Sends a mail via SMTP_URL; without SMTP it is printed to the server log (dev/test). */
export async function sendMail(mail: Mail): Promise<void> {
  const smtp = getTransporter();
  if (!smtp) {
    console.info(`[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  await smtp.sendMail({
    from: process.env.MAIL_FROM ?? "Ämtliplan <noreply@example.com>",
    ...mail,
  });
}
