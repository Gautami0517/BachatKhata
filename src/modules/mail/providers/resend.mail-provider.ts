import { Injectable } from '@nestjs/common';
import {
  MailMessage,
  MailProviderPort,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class ResendMailProvider implements MailProviderPort {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, fromEmail: string, fromName: string) {
    this.apiKey = apiKey;
    this.from = `${fromName} <${fromEmail}>`;
  }

  async send(message: MailMessage): Promise<void> {
    const { Resend } = await import('resend');
    const resend = new Resend(this.apiKey);

    const { error } = await resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
