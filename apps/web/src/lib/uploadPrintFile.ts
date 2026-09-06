import type { SizeDimsMm } from '@inknova/shared'

export const PRINT_UPLOAD_ACCEPT =
  'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg'

const MAX_BYTES = 40 * 1024 * 1024

export type PrintUploadResult = {
  blob: Blob
  fileName: string
  source: 'pdf' | 'png' | 'jpg'
}

function isPdf(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'application/pdf' || name.endsWith('.pdf')
}

function isPng(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'image/png' || name.endsWith('.png')
}

function isJpg(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    file.type === 'image/jpeg' ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  )
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'design'
}

function withExtension(fileName: string, ext: '.pdf' | '.png' | '.jpg'): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(ext)) return fileName
  return `${baseName(fileName)}${ext}`
}

/**
 * Accept a customer print file (PDF, PNG, or JPG) and return it unchanged for the cart.
 */
export function printFileMimeType(
  blob: Blob | null,
  fileName?: string | null,
): string {
  if (blob?.type && blob.type !== 'application/octet-stream') {
    return blob.type
  }
  const lower = (fileName ?? '').toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/pdf'
}

export function isImagePrintFile(
  blob: Blob | null,
  fileName?: string | null,
): boolean {
  return printFileMimeType(blob, fileName).startsWith('image/')
}

export function withPrintMimeType(blob: Blob, fileName?: string | null): Blob {
  const mime = printFileMimeType(blob, fileName)
  if (blob.type === mime) return blob
  return new Blob([blob], { type: mime })
}

/** Open a print file in a new tab. Creates a fresh object URL from the blob. */
export function openPrintFileInNewTab(blob: Blob, fileName?: string | null): void {
  const typed = withPrintMimeType(blob, fileName)
  const url = URL.createObjectURL(typed)
  const cleanup = () => {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
  }

  const tab = window.open(url, '_blank', 'noopener,noreferrer')
  if (tab) {
    cleanup()
    return
  }

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  cleanup()
}

export async function normalizePrintUpload(
  file: File,
  _dims: SizeDimsMm,
  _productSlug: string,
  _sizeId: string,
): Promise<PrintUploadResult> {
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('invalid-size')
  }

  if (isPdf(file)) {
    return {
      blob: file,
      fileName: withExtension(file.name, '.pdf'),
      source: 'pdf',
    }
  }

  if (isPng(file)) {
    return {
      blob: file,
      fileName: withExtension(file.name, '.png'),
      source: 'png',
    }
  }

  if (isJpg(file)) {
    return {
      blob: file,
      fileName: withExtension(file.name, '.jpg'),
      source: 'jpg',
    }
  }

  throw new Error('invalid-type')
}
