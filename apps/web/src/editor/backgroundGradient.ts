import {
  MAX_GRADIENT_STOPS,
  type BackgroundGradient,
  type GradientStop,
} from './types'

export { MAX_GRADIENT_STOPS }

export function defaultGradient(fallbackColor: string): BackgroundGradient {
  return {
    type: 'linear',
    angle: 180,
    centerX: 50,
    centerY: 50,
    stops: [
      { color: fallbackColor, position: 0 },
      { color: '#ffffff', position: 100 },
    ],
  }
}

/** Normalize legacy two-color gradients and sort stops. */
export function normalizeGradient(
  gradient: BackgroundGradient | null | undefined,
  fallbackColor: string,
): BackgroundGradient | null {
  if (!gradient) return null

  if (gradient.stops?.length >= 2) {
    return {
      type: gradient.type,
      angle: gradient.angle ?? 180,
      centerX: gradient.centerX ?? 50,
      centerY: gradient.centerY ?? 50,
      stops: [...gradient.stops]
        .sort((a, b) => a.position - b.position)
        .slice(0, MAX_GRADIENT_STOPS),
    }
  }

  return {
    type: gradient.type ?? 'linear',
    angle: gradient.angle ?? 180,
    centerX: gradient.centerX ?? 50,
    centerY: gradient.centerY ?? 50,
    stops: [
      { color: gradient.colorFrom ?? fallbackColor, position: 0 },
      { color: gradient.colorTo ?? '#ffffff', position: 100 },
    ],
  }
}

function sortedStops(gradient: BackgroundGradient): GradientStop[] {
  return [...gradient.stops].sort((a, b) => a.position - b.position)
}

function stopListCss(stops: GradientStop[]): string {
  return stops.map((s) => `${s.color} ${s.position}%`).join(', ')
}

function konvaColorStops(stops: GradientStop[]): (number | string)[] {
  const out: (number | string)[] = []
  for (const stop of stops) {
    out.push(Math.min(1, Math.max(0, stop.position / 100)), stop.color)
  }
  return out
}

function centerPx(
  gradient: BackgroundGradient,
  width: number,
  height: number,
): { cx: number; cy: number } {
  return {
    cx: ((gradient.centerX ?? 50) / 100) * width,
    cy: ((gradient.centerY ?? 50) / 100) * height,
  }
}

/** CSS linear-gradient angle (deg, clockwise from top). */
export function gradientToCss(
  raw: BackgroundGradient,
  fallbackColor = '#ffffff',
): string {
  const gradient = normalizeGradient(raw, fallbackColor)!
  const stops = sortedStops(gradient)

  if (gradient.type === 'radial') {
    const cx = gradient.centerX ?? 50
    const cy = gradient.centerY ?? 50
    return `radial-gradient(circle at ${cx}% ${cy}%, ${stopListCss(stops)})`
  }

  const angle = gradient.angle ?? 180
  return `linear-gradient(${angle}deg, ${stopListCss(stops)})`
}

export function konvaGradientProps(
  raw: BackgroundGradient,
  width: number,
  height: number,
  fallbackColor = '#ffffff',
): Record<string, unknown> {
  const gradient = normalizeGradient(raw, fallbackColor)!
  const stops = sortedStops(gradient)
  const colorStops = konvaColorStops(stops)
  const { cx, cy } = centerPx(gradient, width, height)

  if (gradient.type === 'radial') {
    const radius = Math.max(width, height) / 2
    return {
      fillRadialGradientStartPoint: { x: cx, y: cy },
      fillRadialGradientEndPoint: { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: radius,
      fillRadialGradientColorStops: colorStops,
    }
  }

  const angle = gradient.angle ?? 180
  const rad = ((angle - 90) * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const half = Math.max(width, height) / 2

  return {
    fillLinearGradientStartPoint: { x: cx - dx * half, y: cy - dy * half },
    fillLinearGradientEndPoint: { x: cx + dx * half, y: cy + dy * half },
    fillLinearGradientColorStops: colorStops,
  }
}

export function addGradientStop(stops: GradientStop[]): GradientStop[] {
  if (stops.length >= MAX_GRADIENT_STOPS) return stops
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  let bestIdx = 0
  let bestGap = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1]!.position - sorted[i]!.position
    if (gap > bestGap) {
      bestGap = gap
      bestIdx = i
    }
  }
  const left = sorted[bestIdx]!
  const right = sorted[bestIdx + 1]!
  const position = Math.round((left.position + right.position) / 2)
  return [...sorted, { color: right.color, position }].sort(
    (a, b) => a.position - b.position,
  )
}

export function removeGradientStop(
  stops: GradientStop[],
  index: number,
): GradientStop[] {
  if (stops.length <= 2) return stops
  return stops.filter((_, i) => i !== index)
}

export function patchGradientStop(
  stops: GradientStop[],
  index: number,
  patch: Partial<GradientStop>,
): GradientStop[] {
  return stops.map((stop, i) =>
    i === index ? { ...stop, ...patch } : stop,
  )
}
