import type { DesignElement } from './types'

export type SnapGuide = {
  orientation: 'v' | 'h'
  /** Position in canvas coordinates */
  pos: number
}

export type Box = {
  x: number
  y: number
  width: number
  height: number
}

/** Snap only when close — smaller = less “sticky” (Figma-like, not aggressive) */
const DEFAULT_THRESHOLD = 4

function elementBox(el: DesignElement): Box {
  if (el.type === 'text') {
    // Approximate height for snap targets (actual node height may differ)
    const lines = Math.max(1, el.text.split('\n').length)
    return {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.fontSize * lines * 1.25,
    }
  }
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  }
}

function collectTargets(
  pageWidth: number,
  pageHeight: number,
  elements: DesignElement[],
  excludeId: string,
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([0, pageWidth / 2, pageWidth])
  const ys = new Set<number>([0, pageHeight / 2, pageHeight])

  for (const el of elements) {
    if (el.id === excludeId) continue
    const b = elementBox(el)
    xs.add(b.x)
    xs.add(b.x + b.width / 2)
    xs.add(b.x + b.width)
    ys.add(b.y)
    ys.add(b.y + b.height / 2)
    ys.add(b.y + b.height)
  }

  return { xs: [...xs], ys: [...ys] }
}

function nearest(
  value: number,
  targets: number[],
  threshold: number,
): number | null {
  let best: number | null = null
  let bestDist = threshold
  for (const t of targets) {
    const d = Math.abs(value - t)
    if (d <= bestDist) {
      bestDist = d
      best = t
    }
  }
  return best
}

/**
 * Snap a box's edges/centers to page edges, centers, and other elements.
 * Returns adjusted x/y and active guide lines.
 */
export function snapTranslate(
  box: Box,
  pageWidth: number,
  pageHeight: number,
  elements: DesignElement[],
  excludeId: string,
  threshold = DEFAULT_THRESHOLD,
): { x: number; y: number; guides: SnapGuide[] } {
  const { xs, ys } = collectTargets(pageWidth, pageHeight, elements, excludeId)
  const guides: SnapGuide[] = []

  let { x, y } = box
  const left = box.x
  const cx = box.x + box.width / 2
  const right = box.x + box.width
  const top = box.y
  const cy = box.y + box.height / 2
  const bottom = box.y + box.height

  // Prefer strongest (closest) snap among left/center/right
  type Cand = { delta: number; guide: number }
  const xCands: Cand[] = []
  const snapL = nearest(left, xs, threshold)
  if (snapL != null) xCands.push({ delta: snapL - left, guide: snapL })
  const snapCx = nearest(cx, xs, threshold)
  if (snapCx != null) xCands.push({ delta: snapCx - cx, guide: snapCx })
  const snapR = nearest(right, xs, threshold)
  if (snapR != null) xCands.push({ delta: snapR - right, guide: snapR })
  if (xCands.length) {
    xCands.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))
    const best = xCands[0]!
    x += best.delta
    guides.push({ orientation: 'v', pos: best.guide })
  }

  const yCands: Cand[] = []
  const snapT = nearest(top, ys, threshold)
  if (snapT != null) yCands.push({ delta: snapT - top, guide: snapT })
  const snapCy = nearest(cy, ys, threshold)
  if (snapCy != null) yCands.push({ delta: snapCy - cy, guide: snapCy })
  const snapB = nearest(bottom, ys, threshold)
  if (snapB != null) yCands.push({ delta: snapB - bottom, guide: snapB })
  if (yCands.length) {
    yCands.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))
    const best = yCands[0]!
    y += best.delta
    guides.push({ orientation: 'h', pos: best.guide })
  }

  return { x, y, guides }
}

/**
 * Snap resize while keeping opposite edge anchored when possible.
 * anchor: which edges stay fixed based on Konva transformer active anchor.
 */
export function snapResize(
  box: Box,
  pageWidth: number,
  pageHeight: number,
  elements: DesignElement[],
  excludeId: string,
  threshold = DEFAULT_THRESHOLD,
): { box: Box; guides: SnapGuide[] } {
  const { xs, ys } = collectTargets(pageWidth, pageHeight, elements, excludeId)
  const guides: SnapGuide[] = []
  let { x, y, width, height } = box

  const right = x + width
  const bottom = y + height

  const snapR = nearest(right, xs, threshold)
  if (snapR != null) {
    width = Math.max(20, snapR - x)
    guides.push({ orientation: 'v', pos: snapR })
  }
  const snapL = nearest(x, xs, threshold)
  if (snapL != null && snapR == null) {
    const newRight = x + width
    x = snapL
    width = Math.max(20, newRight - x)
    guides.push({ orientation: 'v', pos: snapL })
  }

  const snapB = nearest(bottom, ys, threshold)
  if (snapB != null) {
    height = Math.max(20, snapB - y)
    guides.push({ orientation: 'h', pos: snapB })
  }
  const snapT = nearest(y, ys, threshold)
  if (snapT != null && snapB == null) {
    const newBottom = y + height
    y = snapT
    height = Math.max(20, newBottom - y)
    guides.push({ orientation: 'h', pos: snapT })
  }

  // Full-bleed: if nearly covering the page, snap to exact page size
  if (
    Math.abs(x) <= threshold &&
    Math.abs(y) <= threshold &&
    Math.abs(width - pageWidth) <= threshold * 2 &&
    Math.abs(height - pageHeight) <= threshold * 2
  ) {
    x = 0
    y = 0
    width = pageWidth
    height = pageHeight
    guides.push(
      { orientation: 'v', pos: 0 },
      { orientation: 'v', pos: pageWidth },
      { orientation: 'h', pos: 0 },
      { orientation: 'h', pos: pageHeight },
    )
  }

  return { box: { x, y, width, height }, guides }
}
