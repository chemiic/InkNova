import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SendMailInput } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const dryRun = this.config.get<string>('MAIL_DRY_RUN') === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!dryRun && user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'send.one.com'),
        port: Number(this.config.get<string>('SMTP_PORT', '587')),
        secure: false,
        auth: { user, pass },
      });
    }
  }

  async send(input: SendMailInput): Promise<void> {
    const from =
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'noreply@inknova.no';

    const attachmentNote = input.attachments?.length
      ? ` | Attachments: ${input.attachments
          .map((a) => `${a.filename} (${a.content.length} B)`)
          .join(', ')}`
      : '';

    if (!this.transporter) {
      this.logger.log(
        `[MAIL_DRY_RUN] To: ${input.to} | Subject: ${input.subject}${attachmentNote}\n${input.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType ?? 'application/pdf',
      })),
    });
  }
}
