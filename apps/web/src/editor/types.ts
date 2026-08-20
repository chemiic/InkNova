import { createId } from '@/lib/utils'

export type TextAlign = 'left' | 'center' | 'right'

export type TextElement = {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  text: string
  fontSize: number
  fontFamily: string
  fill: string
  align: TextAlign
}

export type ImageElement = {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  /** null = empty slot; user fills via upload */
  src: string | null
  slotLabel?: string
}

export type DesignElement = TextElement | ImageElement

export type GradientStop = {
  color: string
  /** 0–100 along the gradient axis */
  position: number
}

export const MAX_GRADIENT_STOPS = 5

export type BackgroundGradient = {
  type: 'linear' | 'radial'
  stops: GradientStop[]
  /** Degrees for linear gradients (CSS convention, default 180 = top→bottom). */
  angle?: number
  /** Center X in % of canvas width (0–100). Default 50. */
  centerX?: number
  /** Center Y in % of canvas height (0–100). Default 50. */
  centerY?: number
  /** @deprecated Legacy two-stop fields — migrated on load */
  colorFrom?: string
  /** @deprecated Legacy two-stop fields — migrated on load */
  colorTo?: string
}

/** One printable side (e.g. business-card front/back) */
export type DesignPageSide = {
  id: string
  /** i18n key under design.pageLabels.<key> */
  labelKey: string
  /** Solid colour under everything (also gradient fallback) */
  background: string
  /** Optional gradient fill; takes precedence over solid colour when set */
  backgroundGradient?: BackgroundGradient | null
  /** Optional full-bleed photo (cover-fit); null = colour only */
  backgroundImage?: string | null
  elements: DesignElement[]
}

export type DesignDoc = {
  width: number
  height: number
  pages: DesignPageSide[]
}

export type TemplateDef = {
  id: string
  /** i18n key under design.templateNames.<id> */
  nameKey: string
  /** Product slugs this template fits; empty = all */
  productSlugs?: string[]
  build: (
    width: number,
    height: number,
    productSlug?: string,
    copy?: TemplateCopy,
  ) => DesignDoc
}

/** Localized placeholder strings for stub templates */
export type TemplateCopy = {
  logo: string
  yourName: string
  titleRole: string
  contactLine: string
  companyName: string
  website: string
  image: string
  headline: string
  shortDescription: string
  event: string
  titleHere: string
  photo: string
  datePlaceTime: string
}

/** Fallback (nb) if build is called without copy */
export const DEFAULT_TEMPLATE_COPY: TemplateCopy = {
  logo: 'Logo',
  yourName: 'Ditt navn',
  titleRole: 'Tittel / rolle',
  contactLine: 'epost@firma.no  ·  +47 000 00 000',
  companyName: 'Firmanavn AS',
  website: 'www.firma.no',
  image: 'Bilde',
  headline: 'Overskrift',
  shortDescription: 'Kort beskrivelse av tilbudet eller arrangementet.',
  event: 'EVENT',
  titleHere: 'Tittel her',
  photo: 'Foto',
  datePlaceTime: 'Dato · Sted · Tid',
}

export function uid(prefix = 'el'): string {
  return `${prefix}-${createId().slice(0, 8)}`
}

export function makePage(
  labelKey: string,
  background: string,
  elements: DesignElement[] = [],
): DesignPageSide {
  return {
    id: uid('page'),
    labelKey,
    background,
    backgroundGradient: null,
    backgroundImage: null,
    elements,
  }
}

/** Cover-fit an image into a box (like CSS background-size: cover). */
export function coverFit(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; width: number; height: number } {
  if (imgW <= 0 || imgH <= 0) {
    return { x: 0, y: 0, width: boxW, height: boxH }
  }
  const s = Math.max(boxW / imgW, boxH / imgH)
  const width = imgW * s
  const height = imgH * s
  return {
    x: (boxW - width) / 2,
    y: (boxH - height) / 2,
    width,
    height,
  }
}
