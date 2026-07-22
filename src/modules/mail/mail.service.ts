import { Injectable } from '@nestjs/common';
import type {
  MailMessage,
  MailProviderPort,
} from './interfaces/mail-provider.interface';

@Injectable()
export class MailService {
  constructor(private readonly provider: MailProviderPort) {}

  send(message: MailMessage): Promise<void> {
    return this.provider.send(message);
  }
}
