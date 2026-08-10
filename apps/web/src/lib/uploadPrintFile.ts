import { BLEED_MM, type SizeDimsMm } from '@inknova/shared'
import { jsPDF } from 'jspdf'

export const PRINT_UPLOAD_ACCEPT = 'application/pdf,image/png,.pdf,.png'

const MAX_BYTES = 40 * 1024 * 1024

export type PrintUploadResult = {
  blob: Blob
  fileName: string
  source: 'pdf' | 'png'
}

function isPdf(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'application/pdf' || name.endsWith('.pdf')
}

function isPng(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'image/png' || name.endsWith('.png')
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('png load failed'))
    }
    img.src = url
  })
}

/** Wrap a PNG into a single-page PDF at product trim size + bleed. */
async function pngToPrintPdf(
  file: File,
  dims: SizeDimsMm,
): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const pageWmm = dims.widthMm + BLEED_MM * 2
  const pageHmm = dims.heightMm + BLEED_MM * 2
  const orientation = pageWmm > pageHmm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWmm, pageHmm],
  })

  // Cover the full print page (customer is responsible for bleed in the file).
  const pageRatio = pageWmm / pageHmm
  const imgRatio = img.naturalWidth / img.naturalHeight
  let drawW = pageWmm
  let drawH = pageHmm
  let offsetX = 0
  let offsetY = 0
  if (imgRatio > pageRatio) {
    drawH = pageHmm
    drawW = pageHmm * imgRatio
    offsetX = (pageWmm - drawW) / 2
  } else {
    drawW = pageWmm
    drawH = pageWmm / imgRatio
    offsetY = (pageHmm - drawH) / 2
  }

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(img, 0, 0)
  const dataUrl = canvas.toDataURL('image/png')

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, drawW, drawH)
  return pdf.output('blob')
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'design'
}

/**
 * Accept a customer print file (PDF or PNG) and return a PDF blob for the cart.
 * PDF is stored as-is; PNG is wrapped into a page matching the selected size.
 */
export async function normalizePrintUpload(
  file: File,
  dims: SizeDimsMm,
  productSlug: string,
  sizeId: string,
): Promise<PrintUploadResult> {
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error('invalid-size')
  }

  if (isPdf(file)) {
    return {
      blob: file,
      fileName: file.name.toLowerCase().endsWith('.pdf')
        ? file.name
        : `${baseName(file.name)}.pdf`,
      source: 'pdf',
    }
  }

  if (isPng(file)) {
    const blob = await pngToPrintPdf(file, dims)
    return {
      blob,
      fileName: `${productSlug}-${sizeId}.pdf`,
      source: 'png',
    }
  }

  throw new Error('invalid-type')
}
