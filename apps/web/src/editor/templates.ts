import { DEFAULT_FONT } from './fonts'
import type { DesignDoc, DesignElement, TemplateCopy, TemplateDef } from './types'
import { DEFAULT_TEMPLATE_COPY, makePage, uid } from './types'

/** Products that always have front + back in the editor */
export const DOUBLE_SIDED_SLUGS = new Set(['visittkort'])

export function isDoubleSidedProduct(productSlug: string): boolean {
  return DOUBLE_SIDED_SLUGS.has(productSlug)
}

/**
 * Ensure page count/labels match the product (e.g. visittkort → front+back
 * even for blank template).
 */
export function applyProductPageStructure(
  doc: DesignDoc,
  productSlug: string,
): DesignDoc {
  if (!isDoubleSidedProduct(productSlug)) {
    return {
      ...doc,
      pages: doc.pages.slice(0, Math.max(1, doc.pages.length)).map((p, i) =>
        i === 0 && (p.labelKey === 'front' || p.labelKey === 'back')
          ? { ...p, labelKey: 'page' }
          : p,
      ),
    }
  }

  const pages = [...doc.pages]
  const bg = pages[0]?.background ?? '#ffffff'
  while (pages.length < 2) {
    pages.push(makePage(pages.length === 0 ? 'front' : 'back', bg))
  }

  return {
    ...doc,
    pages: pages.slice(0, 2).map((p, i) => ({
      ...p,
      labelKey: i === 0 ? 'front' : 'back',
    })),
  }
}

function resolveCopy(copy?: TemplateCopy): TemplateCopy {
  return copy ?? DEFAULT_TEMPLATE_COPY
}

function blank(width: number, height: number, productSlug = ''): DesignDoc {
  if (isDoubleSidedProduct(productSlug)) {
    return {
      width,
      height,
      pages: [makePage('front', '#ffffff'), makePage('back', '#ffffff')],
    }
  }
  return {
    width,
    height,
    pages: [makePage('page', '#ffffff')],
  }
}

function classicCardFront(
  width: number,
  height: number,
  copy: TemplateCopy,
): DesignElement[] {
  const pad = Math.round(Math.min(width, height) * 0.08)
  return [
    {
      id: uid('img'),
      type: 'image',
      x: pad,
      y: pad,
      width: Math.round(width * 0.28),
      height: Math.round(height * 0.45),
      src: null,
      slotLabel: copy.logo,
    },
    {
      id: uid('txt'),
      type: 'text',
      x: pad + Math.round(width * 0.32),
      y: pad,
      width: width - pad * 2 - Math.round(width * 0.32),
      text: copy.yourName,
      fontSize: Math.max(14, Math.round(height * 0.14)),
      fontFamily: DEFAULT_FONT,
      fill: '#1a1a1a',
      align: 'left',
    },
    {
      id: uid('txt'),
      type: 'text',
      x: pad + Math.round(width * 0.32),
      y: pad + Math.round(height * 0.28),
      width: width - pad * 2 - Math.round(width * 0.32),
      text: copy.titleRole,
      fontSize: Math.max(10, Math.round(height * 0.08)),
      fontFamily: DEFAULT_FONT,
      fill: '#5c574f',
      align: 'left',
    },
    {
      id: uid('txt'),
      type: 'text',
      x: pad,
      y: height - pad - Math.round(height * 0.22),
      width: width - pad * 2,
      text: copy.contactLine,
      fontSize: Math.max(9, Math.round(height * 0.07)),
      fontFamily: DEFAULT_FONT,
      fill: '#5c574f',
      align: 'left',
    },
  ]
}

function classicCardBack(
  width: number,
  height: number,
  copy: TemplateCopy,
): DesignElement[] {
  const pad = Math.round(Math.min(width, height) * 0.1)
  return [
    {
      id: uid('img'),
      type: 'image',
      x: Math.round(width * 0.3),
      y: Math.round(height * 0.18),
      width: Math.round(width * 0.4),
      height: Math.round(height * 0.4),
      src: null,
      slotLabel: copy.logo,
    },
    {
      id: uid('txt'),
      type: 'text',
      x: pad,
      y: Math.round(height * 0.68),
      width: width - pad * 2,
      text: copy.companyName,
      fontSize: Math.max(12, Math.round(height * 0.1)),
      fontFamily: 'Montserrat',
      fill: '#1a1a1a',
      align: 'center',
    },
    {
      id: uid('txt'),
      type: 'text',
      x: pad,
      y: Math.round(height * 0.82),
      width: width - pad * 2,
      text: copy.website,
      fontSize: Math.max(9, Math.round(height * 0.07)),
      fontFamily: DEFAULT_FONT,
      fill: '#5c574f',
      align: 'center',
    },
  ]
}

/** Two-sided business card: front + back */
function classicCard(
  width: number,
  height: number,
  _productSlug?: string,
  copy?: TemplateCopy,
): DesignDoc {
  const c = resolveCopy(copy)
  return {
    width,
    height,
    pages: [
      makePage('front', '#f7f4ef', classicCardFront(width, height, c)),
      makePage('back', '#f7f4ef', classicCardBack(width, height, c)),
    ],
  }
}

function flyerHero(
  width: number,
  height: number,
  _productSlug?: string,
  copy?: TemplateCopy,
): DesignDoc {
  const c = resolveCopy(copy)
  const pad = Math.round(Math.min(width, height) * 0.06)
  return {
    width,
    height,
    pages: [
      makePage('page', '#ffffff', [
        {
          id: uid('img'),
          type: 'image',
          x: 0,
          y: 0,
          width,
          height: Math.round(height * 0.42),
          src: null,
          slotLabel: c.image,
        },
        {
          id: uid('txt'),
          type: 'text',
          x: pad,
          y: Math.round(height * 0.48),
          width: width - pad * 2,
          text: c.headline,
          fontSize: Math.max(22, Math.round(width * 0.08)),
          fontFamily: 'Montserrat',
          fill: '#1a1a1a',
          align: 'center',
        },
        {
          id: uid('txt'),
          type: 'text',
          x: pad,
          y: Math.round(height * 0.62),
          width: width - pad * 2,
          text: c.shortDescription,
          fontSize: Math.max(12, Math.round(width * 0.035)),
          fontFamily: DEFAULT_FONT,
          fill: '#5c574f',
          align: 'center',
        },
        {
          id: uid('img'),
          type: 'image',
          x: Math.round(width * 0.35),
          y: Math.round(height * 0.78),
          width: Math.round(width * 0.3),
          height: Math.round(height * 0.14),
          src: null,
          slotLabel: c.logo,
        },
      ]),
    ],
  }
}

function posterSimple(
  width: number,
  height: number,
  _productSlug?: string,
  copy?: TemplateCopy,
): DesignDoc {
  const c = resolveCopy(copy)
  const pad = Math.round(Math.min(width, height) * 0.07)
  return {
    width,
    height,
    pages: [
      makePage('page', '#1f2a24', [
        {
          id: uid('txt'),
          type: 'text',
          x: pad,
          y: pad,
          width: width - pad * 2,
          text: c.event,
          fontSize: Math.max(18, Math.round(width * 0.06)),
          fontFamily: 'Montserrat',
          fill: '#c8a96a',
          align: 'center',
        },
        {
          id: uid('txt'),
          type: 'text',
          x: pad,
          y: Math.round(height * 0.18),
          width: width - pad * 2,
          text: c.titleHere,
          fontSize: Math.max(28, Math.round(width * 0.1)),
          fontFamily: 'Playfair Display',
          fill: '#f7f4ef',
          align: 'center',
        },
        {
          id: uid('img'),
          type: 'image',
          x: pad,
          y: Math.round(height * 0.38),
          width: width - pad * 2,
          height: Math.round(height * 0.4),
          src: null,
          slotLabel: c.photo,
        },
        {
          id: uid('txt'),
          type: 'text',
          x: pad,
          y: Math.round(height * 0.84),
          width: width - pad * 2,
          text: c.datePlaceTime,
          fontSize: Math.max(14, Math.round(width * 0.04)),
          fontFamily: DEFAULT_FONT,
          fill: '#f7f4ef',
          align: 'center',
        },
      ]),
    ],
  }
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'blank',
    nameKey: 'blank',
    build: blank,
  },
  {
    id: 'classic-card',
    nameKey: 'classicCard',
    productSlugs: ['visittkort'],
    build: classicCard,
  },
  {
    id: 'flyer-hero',
    nameKey: 'flyerHero',
    productSlugs: ['flyers', 'plakater', 'magasin'],
    build: flyerHero,
  },
  {
    id: 'poster-simple',
    nameKey: 'posterSimple',
    productSlugs: [
      'plakater',
      'arbeidstegninger',
      'alu-skilt',
      'forex-plate',
      'rollup',
    ],
    build: posterSimple,
  },
]

export function templatesForProduct(productSlug: string): TemplateDef[] {
  return TEMPLATES.filter(
    (t) =>
      !t.productSlugs ||
      t.productSlugs.length === 0 ||
      t.productSlugs.includes(productSlug),
  )
}

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
