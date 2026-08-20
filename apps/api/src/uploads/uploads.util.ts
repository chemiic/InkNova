import type { Article, Product } from '@inknova/shared';
import { existsSync, unlinkSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve } from 'node:path';

/** Admin-uploaded files served from /uploads/*. */
export function isManagedUploadUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return url.startsWith('/uploads/') && !url.includes('..');
}

export function uploadUrlToAbsPath(
  url: string,
  uploadDir: string,
): string | null {
  if (!isManagedUploadUrl(url)) return null;
  const name = basename(url);
  if (!name || name === '.' || name === '..') return null;
  const root = resolve(uploadDir);
  const abs = resolve(root, name);
  const rel = relative(root, abs);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return abs;
}

export function productImageUrls(product: Product): string[] {
  const urls = new Set<string>();
  if (isManagedUploadUrl(product.imageUrl)) urls.add(product.imageUrl);
  for (const url of product.images ?? []) {
    if (isManagedUploadUrl(url)) urls.add(url);
  }
  return [...urls];
}

export function collectReferencedUploadUrls(
  products: Product[],
  articles: Article[],
): Set<string> {
  const refs = new Set<string>();
  for (const product of products) {
    for (const url of productImageUrls(product)) refs.add(url);
  }
  for (const article of articles) {
    if (isManagedUploadUrl(article.imageUrl)) refs.add(article.imageUrl);
  }
  return refs;
}

export function deleteUploadFile(url: string, uploadDir: string): boolean {
  const abs = uploadUrlToAbsPath(url, uploadDir);
  if (!abs || !existsSync(abs)) return false;
  unlinkSync(abs);
  return true;
}
