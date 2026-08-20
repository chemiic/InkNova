import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { contactEmailHtml } from '../mail/templates';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: ContactDto) {
    const to =
      this.config.get<string>('CONTACT_TO') || 'Kontakt@inknova.no';
    const name = dto.name?.trim() || 'Ukjent';
    const siteUrl = this.config.get<string>(
      'WEB_ORIGIN',
      'https://inknova.no',
    );

    await this.mail.send({
      to,
      replyTo: dto.email,
      subject: `Kontaktskjema: ${name}`,
      text: [
        `Navn: ${name}`,
        `E-post: ${dto.email}`,
        'Personvernsamtykke: ja',
        '',
        'Melding:',
        dto.message,
      ].join('\n'),
      html: contactEmailHtml({
        name,
        email: dto.email,
        message: dto.message,
        siteUrl,
      }),
    });

    return { ok: true as const };
  }
}
