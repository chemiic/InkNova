import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { VippsService } from './vipps.service';
import {
  VIPPS_WEBHOOK_EVENTS,
  isPublicHttpsUrl,
  sameWebhookEvents,
  sameWebhookUrl,
  webhookCallbackUrl,
} from './vipps-webhook';

const SETTING_KEY = 'vipps.webhook';

type StoredWebhook = {
  id: string;
  url: string;
  secret: string;
};

@Injectable()
export class VippsWebhookRegistrar implements OnModuleInit {
  private readonly logger = new Logger(VippsWebhookRegistrar.name);

  constructor(
    private readonly vipps: VippsService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.vipps.isConfigured() || this.vipps.isDryRun()) return;

    const url = webhookCallbackUrl(
      this.config.get<string>('VIPPS_WEBHOOK_URL'),
      this.config.get<string>('WEB_ORIGIN'),
    );
    if (!url || !isPublicHttpsUrl(url)) {
      this.logger.warn(
        'Vipps webhook is not registered. Set VIPPS_WEBHOOK_URL (or WEB_ORIGIN) to a public https address so a paid order completes even if the customer never returns to the site.',
      );
      return;
    }

    try {
      await this.ensureRegistered(url);
    } catch (error) {
      this.logger.error('Vipps webhook registration failed', error);
    }
  }

  webhookSecret(): string | null {
    const stored = this.readStored();
    if (stored?.secret) return stored.secret;
    const fromEnv = this.config.get<string>('VIPPS_WEBHOOK_SECRET')?.trim();
    return fromEnv || null;
  }

  private async ensureRegistered(url: string): Promise<void> {
    const listed = (await this.vipps.listWebhooks()).filter((hook) =>
      sameWebhookUrl(hook.url, url),
    );
    const stored = this.readStored();
    const current = listed.find(
      (hook) => hook.id === stored?.id && sameWebhookUrl(hook.url, url),
    );
    const eventsOk =
      !current ||
      current.events.length === 0 ||
      sameWebhookEvents(current.events, VIPPS_WEBHOOK_EVENTS);
    if (current && stored?.secret && eventsOk) {
      for (const hook of listed) {
        if (hook.id !== current.id) await this.vipps.deleteWebhook(hook.id);
      }
      this.logger.log(`Vipps webhook already registered (${current.id})`);
      return;
    }

    for (const hook of listed) {
      await this.vipps.deleteWebhook(hook.id);
    }

    const created = await this.vipps.registerWebhook(url, [
      ...VIPPS_WEBHOOK_EVENTS,
    ]);
    this.db.setSetting(
      SETTING_KEY,
      JSON.stringify({
        id: created.id,
        url,
        secret: created.secret,
      } satisfies StoredWebhook),
    );
    this.logger.log(`Vipps webhook registered (${created.id})`);
  }

  private readStored(): StoredWebhook | null {
    const raw = this.db.getSetting(SETTING_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredWebhook>;
      if (!parsed.id || !parsed.secret || !parsed.url) return null;
      return { id: parsed.id, url: parsed.url, secret: parsed.secret };
    } catch {
      return null;
    }
  }
}
