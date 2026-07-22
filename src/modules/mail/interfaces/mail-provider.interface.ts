export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface MailProviderPort {
  send(message: MailMessage): Promise<void>;
}
