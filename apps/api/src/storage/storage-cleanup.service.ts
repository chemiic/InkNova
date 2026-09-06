import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type {
  StorageCleanupPlan,
  StorageCleanupResult,
  StorageStats,
} from '@inknova/shared';
import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import {
  collectReferencedUploadUrls,
  deleteUploadFile,
  isManagedUploadUrl,
} from '../uploads/uploads.util';
import { listFilesRecursive, measurePath, removePath } from './storage.util';

type OrderDirPlan = {
  id: string | null;
  reference: string;
  bytes: number;
};

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);
  private lastCleanupAt: string | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly catalog: CatalogService,
    private readonly config: ConfigService,
  ) {}

  async getStats(): Promise<StorageStats> {
    const orderFilesRoot = this.db.getOrderFilesRoot();
    const uploadDir = this.getUploadDir();
    const dbPath = this.config.get<string>(
      'DATABASE_PATH',
      join(process.cwd(), 'data', 'inknova.db'),
    );

    const orderUsage = measurePath(orderFilesRoot);
    const orderCount = existsSync(orderFilesRoot)
      ? readdirSync(orderFilesRoot, { withFileTypes: true }).filter((e) =>
          e.isDirectory(),
        ).length
      : 0;
    const uploads = measurePath(uploadDir);
    const database = measurePath(dbPath);
    const cleanupPlan = await this.getCleanupPlan();

    return {
      orderFiles: {
        bytes: orderUsage.bytes,
        fileCount: orderUsage.fileCount,
        orderCount,
      },
      uploads: {
        bytes: uploads.bytes,
        fileCount: uploads.fileCount,
      },
      database: {
        bytes: database.bytes,
      },
      totalManagedBytes: orderUsage.bytes + uploads.bytes + database.bytes,
      maxOrderFileBytes: 40 * 1024 * 1024,
      maxOrderLineItems: 20,
      lastCleanupAt: this.lastCleanupAt,
      cleanupPlan,
    };
  }

  async getCleanupPlan(): Promise<StorageCleanupPlan> {
    const orderDirs = this.planOrderFileCleanup();
    const orphanUploads = await this.listOrphanUploadPaths();
    return {
      orderDirsEligible: orderDirs.length,
      orderBytesEligible: orderDirs.reduce((sum, d) => sum + d.bytes, 0),
      orphanUploadsEligible: orphanUploads.length,
    };
  }

  async runCleanup(): Promise<StorageCleanupResult> {
    const orderResult = this.pruneOrderFiles(this.planOrderFileCleanup());
    const uploadResult = await this.pruneOrphanUploads();
    this.lastCleanupAt = new Date().toISOString();

    const result: StorageCleanupResult = {
      ok: true,
      orderDirsRemoved: orderResult.dirsRemoved,
      orderBytesFreed: orderResult.bytesFreed,
      uploadsRemoved: uploadResult.filesRemoved,
      uploadBytesFreed: uploadResult.bytesFreed,
      ranAt: this.lastCleanupAt,
    };

    if (result.orderDirsRemoved > 0 || result.uploadsRemoved > 0) {
      this.logger.log(
        `Storage cleanup: removed ${result.orderDirsRemoved} order dirs (${result.orderBytesFreed} B), ${result.uploadsRemoved} uploads (${result.uploadBytesFreed} B)`,
      );
    }

    return result;
  }

  private planOrderFileCleanup(): OrderDirPlan[] {
    const orderFilesRoot = this.db.getOrderFilesRoot();
    const dirs: OrderDirPlan[] = [];
    const seen = new Set<string>();

    for (const order of this.db.listOrdersForFileCleanup()) {
      const dir = join(orderFilesRoot, order.reference);
      if (!existsSync(dir)) continue;

      const usage = measurePath(dir);
      if (usage.bytes <= 0 && usage.fileCount <= 0) continue;

      seen.add(order.reference);
      dirs.push({
        id: order.id,
        reference: order.reference,
        bytes: usage.bytes,
      });
    }

    if (existsSync(orderFilesRoot)) {
      for (const entry of readdirSync(orderFilesRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || seen.has(entry.name)) continue;

        const dir = join(orderFilesRoot, entry.name);
        const usage = measurePath(dir);
        if (usage.bytes <= 0 && usage.fileCount <= 0) continue;

        dirs.push({
          id: null,
          reference: entry.name,
          bytes: usage.bytes,
        });
      }
    }

    return dirs;
  }

  private async listOrphanUploadPaths(): Promise<string[]> {
    const uploadDir = this.getUploadDir();
    if (!existsSync(uploadDir)) return [];

    const referenced = collectReferencedUploadUrls(
      await this.catalog.listAll(),
      this.db.listArticles(),
    );

    const orphans: string[] = [];
    for (const absPath of listFilesRecursive(uploadDir)) {
      const url = `/uploads/${basename(absPath)}`;
      if (!isManagedUploadUrl(url) || referenced.has(url)) continue;
      orphans.push(absPath);
    }
    return orphans;
  }

  private pruneOrderFiles(plan: OrderDirPlan[]): {
    dirsRemoved: number;
    bytesFreed: number;
  } {
    const orderFilesRoot = this.db.getOrderFilesRoot();
    let dirsRemoved = 0;
    let bytesFreed = 0;

    for (const entry of plan) {
      const dir = join(orderFilesRoot, entry.reference);
      bytesFreed += removePath(dir);
      if (entry.id) {
        this.db.clearOrderPdfPaths(entry.id);
      }
      dirsRemoved += 1;
      this.logger.log(`Removed order files for ${entry.reference}`);
    }

    return { dirsRemoved, bytesFreed };
  }

  private async pruneOrphanUploads(): Promise<{
    filesRemoved: number;
    bytesFreed: number;
  }> {
    const uploadDir = this.getUploadDir();
    const orphans = await this.listOrphanUploadPaths();

    let filesRemoved = 0;
    let bytesFreed = 0;

    for (const absPath of orphans) {
      const url = `/uploads/${basename(absPath)}`;
      const usage = measurePath(absPath);
      if (deleteUploadFile(url, uploadDir)) {
        filesRemoved += 1;
        bytesFreed += usage.bytes;
        this.logger.log(`Removed orphan upload ${url}`);
      }
    }

    return { filesRemoved, bytesFreed };
  }

  private getUploadDir(): string {
    return this.config.get<string>(
      'UPLOAD_DIR',
      join(process.cwd(), 'uploads'),
    );
  }
}
