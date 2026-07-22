import { Injectable, Logger } from '@nestjs/common';
import {
  MailMessage,
  MailProviderPort,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class ConsoleMailProvider implements MailProviderPort {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `\n--- EMAIL TO ${message.to} ---\nSUBJECT: ${message.subject}\n${message.text}\n---`,
    );
    return Promise.resolve();
  }
}
