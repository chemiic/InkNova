import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
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

    await this.mail.send({
      to,
      replyTo: dto.email,
      subject: `Kontaktskjema: ${name}`,
      text: [
        `Navn: ${name}`,
        `E-post: ${dto.email}`,
        '',
        'Melding:',
        dto.message,
      ].join('\n'),
      html: `
        <p><strong>Navn:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-post:</strong> ${escapeHtml(dto.email)}</p>
        <p><strong>Melding:</strong></p>
        <p>${escapeHtml(dto.message).replace(/\n/g, '<br/>')}</p>
      `,
    });

    return { ok: true as const };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
