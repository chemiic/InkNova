import { BLEED_MM, mmToPx, pxToMm } from '@inknova/shared'
import { jsPDF } from 'jspdf'
import Konva from 'konva'
import type { DesignDoc, DesignPageSide } from './types'
import { coverFit } from './types'

const EXPORT_DPI = 150
const PIXEL_RATIO = EXPORT_DPI / 72

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function addCropMarks(
  layer: Konva.Layer,
  trimW: number,
  trimH: number,
  bleedPx: number,
  mark: number,
) {
  const ink = '#222222'
  const strokeWidth = 1
  const marks: Konva.Line[] = [
    new Konva.Line({
      points: [bleedPx - mark, bleedPx, bleedPx - 2, bleedPx],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [bleedPx, bleedPx - mark, bleedPx, bleedPx - 2],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [bleedPx + trimW + 2, bleedPx, bleedPx + trimW + mark, bleedPx],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [bleedPx + trimW, bleedPx - mark, bleedPx + trimW, bleedPx - 2],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [bleedPx - mark, bleedPx + trimH, bleedPx - 2, bleedPx + trimH],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [bleedPx, bleedPx + trimH + 2, bleedPx, bleedPx + trimH + mark],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [
        bleedPx + trimW + 2,
        bleedPx + trimH,
        bleedPx + trimW + mark,
        bleedPx + trimH,
      ],
      stroke: ink,
      strokeWidth,
    }),
    new Konva.Line({
      points: [
        bleedPx + trimW,
        bleedPx + trimH + 2,
        bleedPx + trimW,
        bleedPx + trimH + mark,
      ],
      stroke: ink,
      strokeWidth,
    }),
  ]
  marks.forEach((m) => layer.add(m))
}

async function renderPageDataUrl(
  width: number,
  height: number,
  page: DesignPageSide,
): Promise<string> {
  const bleedPx = mmToPx(BLEED_MM)
  const mark = Math.round(bleedPx * 0.55)
  const pageW = width + bleedPx * 2
  const pageH = height + bleedPx * 2

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  document.body.appendChild(container)

  const stage = new Konva.Stage({
    container,
    width: pageW,
    height: pageH,
  })
  const layer = new Konva.Layer()
  stage.add(layer)

  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      fill: page.background,
    }),
  )

  if (page.backgroundImage) {
    try {
      const bg = await loadImage(page.backgroundImage)
      const fit = coverFit(bg.naturalWidth, bg.naturalHeight, pageW, pageH)
      layer.add(
        new Konva.Image({
          image: bg,
          x: fit.x,
          y: fit.y,
          width: fit.width,
          height: fit.height,
        }),
      )
    } catch {
      // keep solid colour
    }
  }

  for (const el of page.elements) {
    if (el.type === 'text') {
      layer.add(
        new Konva.Text({
          x: el.x + bleedPx,
          y: el.y + bleedPx,
          width: el.width,
          text: el.text,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily,
          fill: el.fill,
          align: el.align,
        }),
      )
    } else if (el.type === 'image' && el.src) {
      try {
        const img = await loadImage(el.src)
        layer.add(
          new Konva.Image({
            image: img,
            x: el.x + bleedPx,
            y: el.y + bleedPx,
            width: el.width,
            height: el.height,
          }),
        )
      } catch {
        // skip broken image
      }
    }
  }

  addCropMarks(layer, width, height, bleedPx, mark)
  layer.draw()

  const dataUrl = stage.toDataURL({
    pixelRatio: PIXEL_RATIO,
    mimeType: 'image/jpeg',
    quality: 0.92,
  })
  stage.destroy()
  document.body.removeChild(container)
  return dataUrl
}

/**
 * Multi-page raster PDF with 3 mm bleed and crop marks per page.
 */
export async function exportPrintPdf(doc: DesignDoc): Promise<Blob> {
  if (!doc.pages.length) {
    throw new Error('Design has no pages')
  }

  const trimWmm = pxToMm(doc.width)
  const trimHmm = pxToMm(doc.height)
  const pageWmm = trimWmm + BLEED_MM * 2
  const pageHmm = trimHmm + BLEED_MM * 2
  const orientation = pageWmm > pageHmm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWmm, pageHmm],
  })

  for (let i = 0; i < doc.pages.length; i++) {
    const dataUrl = await renderPageDataUrl(doc.width, doc.height, doc.pages[i]!)
    if (i > 0) {
      pdf.addPage([pageWmm, pageHmm], orientation)
    }
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWmm, pageHmm)
  }

  return pdf.output('blob')
}
