import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER } from './interfaces/mail-provider.interface';
import type { MailProviderPort } from './interfaces/mail-provider.interface';
import { ConsoleMailProvider } from './providers/console.mail-provider';
import { ResendMailProvider } from './providers/resend.mail-provider';
import { MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailProviderPort => {
        const provider = config.get<'console' | 'resend'>('mail.provider');
        if (provider === 'resend') {
          const apiKey = config.get<string>('resend.apiKey');
          if (!apiKey) {
            throw new Error(
              'MAIL_PROVIDER=resend but RESEND_API_KEY is not set',
            );
          }
          return new ResendMailProvider(
            apiKey,
            config.get<string>('mail.fromEmail')!,
            config.get<string>('mail.fromName')!,
          );
        }
        return new ConsoleMailProvider();
      },
    },
    {
      provide: MailService,
      inject: [MAIL_PROVIDER],
      useFactory: (provider: MailProviderPort) => new MailService(provider),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
