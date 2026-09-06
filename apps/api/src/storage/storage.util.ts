import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type DirUsage = {
  bytes: number;
  fileCount: number;
  dirCount: number;
};

export function measurePath(path: string): DirUsage {
  if (!existsSync(path)) {
    return { bytes: 0, fileCount: 0, dirCount: 0 };
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    return { bytes: stat.size, fileCount: 1, dirCount: 0 };
  }

  let bytes = 0;
  let fileCount = 0;
  let dirCount = 0;

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      dirCount += 1;
      const nested = measurePath(child);
      bytes += nested.bytes;
      fileCount += nested.fileCount;
      dirCount += nested.dirCount;
    } else if (entry.isFile()) {
      fileCount += 1;
      bytes += statSync(child).size;
    }
  }

  return { bytes, fileCount, dirCount };
}

export function removePath(path: string): number {
  if (!existsSync(path)) return 0;
  const usage = measurePath(path);
  rmSync(path, { recursive: true, force: true });
  return usage.bytes;
}

export function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const child = join(root, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}
