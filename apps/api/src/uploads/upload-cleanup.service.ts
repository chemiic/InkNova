import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import {
  collectReferencedUploadUrls,
  deleteUploadFile,
  isManagedUploadUrl,
} from './uploads.util';

@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name);

  constructor(
    private readonly catalog: CatalogService,
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  /** Delete /uploads files no longer referenced by any product or article. */
  async pruneUploads(candidateUrls: string[]): Promise<void> {
    const managed = [...new Set(candidateUrls.filter(isManagedUploadUrl))];
    if (!managed.length) return;

    const uploadDir = this.config.get<string>(
      'UPLOAD_DIR',
      join(process.cwd(), 'uploads'),
    );
    const referenced = collectReferencedUploadUrls(
      await this.catalog.listAll(),
      this.db.listArticles(),
    );

    for (const url of managed) {
      if (referenced.has(url)) continue;
      try {
        if (deleteUploadFile(url, uploadDir)) {
          this.logger.log(`Removed unused upload ${url}`);
        }
      } catch (e) {
        this.logger.warn(`Failed to delete upload ${url}`, e);
      }
    }
  }
}
