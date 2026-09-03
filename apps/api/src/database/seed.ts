import { Logger } from '@nestjs/common';
import type { Article, DeliverySettings, Product } from '@inknova/shared';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseService } from './database.service';

const logger = new Logger('DatabaseSeed');

/** Bump to re-apply catalog.json prices/images onto an existing DB. */
export const CATALOG_PRICING_VERSION = 'priser-2026-09-03';

const ARTICLE_SEED: Omit<Article, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'trykkklart-pdf',
    slug: 'trykkklart-pdf',
    titleNb: 'Hva er et trykkklart PDF?',
    titleEn: 'What is a print-ready PDF?',
    excerptNb: 'Bleed, skjæremerker og hvorfor det betyr noe for resultatet.',
    excerptEn: 'Bleed, crop marks and why they matter.',
    bodyNb:
      'Et trykkklart PDF er en fil som er klar for produksjon: 3 mm bleed (utfallende), skjæremerker og riktig fargeprofil. Når du laster opp egne filer til InkNova, anbefaler vi PDF eller PNG. For beste resultat – eksporter med bleed og crop marks fra designprogrammet ditt.',
    bodyEn:
      'A print-ready PDF is production-ready: 3 mm bleed, crop marks and the right colour profile. When uploading to InkNova, use PDF or PNG. For best results, export with bleed and crop marks from your design tool.',
    imageUrl: '/articles/trykkklart-pdf.svg',
    hidden: false,
  },
  {
    id: 'velge-storrelse',
    slug: 'velge-storrelse',
    titleNb: 'Slik velger du riktig størrelse',
    titleEn: 'How to choose the right size',
    excerptNb: 'A-formater, visittkortmål og når du bør gå custom.',
    excerptEn: 'A-formats, business card sizes and when to go custom.',
    bodyNb:
      'A5, A4 og A6 er vanlige for flyers. Visittkort har flere centimeter-varianter. Plakater og flyers kan også bestilles i egendefinert størrelse innenfor maks-målene på produktsiden. Prisen oppdateres når du bytter størrelse.',
    bodyEn:
      'A5, A4 and A6 are common for flyers. Business cards have several centimetre options. Posters and flyers can also be ordered in a custom size within the max dimensions on the product page. The price updates when you change size.',
    imageUrl: '/articles/velge-storrelse.svg',
    hidden: false,
  },
  {
    id: 'rgb-eller-cmyk',
    slug: 'rgb-eller-cmyk',
    titleNb: 'RGB eller CMYK – hva skal du bruke?',
    titleEn: 'RGB or CMYK – which should you use?',
    excerptNb:
      'Skjerm og trykk snakker ulike fargespråk. Slik unngår du overraskelser.',
    excerptEn:
      'Screens and print speak different colour languages. Here\'s how to avoid surprises.',
    bodyNb:
      'Skjermen din viser farger i RGB (rød, grønn, blå – lys). Trykk bruker CMYK (cyan, magenta, gul og svart – blekk). Noen sterke skjermfarger kan ikke gjengis eksakt i trykk, så resultatet kan se litt dempet ut. For best kontroll: jobb i CMYK når du designer i et profesjonelt program, eller bruk editoren vår og forhåndsvis før du bestiller. Små avvik mellom skjerm og trykk er normalt.',
    bodyEn:
      'Your screen shows colour in RGB (red, green, blue – light). Print uses CMYK (cyan, magenta, yellow and black – ink). Some vivid screen colours cannot be matched exactly in print, so the result can look slightly softer. For best control: work in CMYK in a pro design tool, or use our editor and preview before ordering. Small differences between screen and print are normal.',
    imageUrl: '/articles/rgb-cmyk.svg',
    hidden: false,
  },
  {
    id: 'bildeopplosning',
    slug: 'bildeopplosning',
    titleNb: 'Hvor skarp må bildene være?',
    titleEn: 'How sharp do images need to be?',
    excerptNb: 'DPI, piksler og hvorfor uklare bilder blir synlige i trykk.',
    excerptEn: 'DPI, pixels and why soft images show up in print.',
    bodyNb:
      'Til trykk anbefaler vi bilder rundt 300 DPI i den ferdige størrelsen. Et bilde som ser fint ut på mobil kan fortsatt være for lite til en A4-flyer. Tommelfingerregel: jo større trykkflate, jo flere piksler trenger du. Bruk originale filer fra kamera eller designprogram – ikke skjermbilder eller sterkt komprimerte sosiale medier-bilder når det er mulig.',
    bodyEn:
      'For print we recommend images around 300 DPI at the final size. A photo that looks fine on a phone can still be too small for an A4 flyer. Rule of thumb: the larger the print area, the more pixels you need. Prefer original files from a camera or design tool – not screenshots or heavily compressed social media images when you can avoid it.',
    imageUrl: '/articles/bildeopplosning.svg',
    hidden: false,
  },
];

interface CatalogFile {
  deliveryDefaults?: DeliverySettings | { label: string; fee: number | null };
  products: Product[];
}

export function seedIfEmpty(db: DatabaseService) {
  if (db.countProducts() === 0) {
    const data = loadCatalog();
    for (const product of data.products) {
      upsertCatalogProduct(db, product, null);
    }

    const defaults = data.deliveryDefaults;
    if (defaults) {
      if ('defaultLabel' in defaults) {
        db.setDeliverySettings(defaults);
      } else {
        db.setDeliverySettings({
          defaultLabel: defaults.label,
          defaultFee: defaults.fee,
        });
      }
    } else {
      db.setDeliverySettings({
        defaultLabel: '3–5 virkedager',
        defaultFee: 99,
      });
    }

    logger.log(`Seeded ${data.products.length} products from catalog.json`);
    db.setSetting('catalog_pricing_version', CATALOG_PRICING_VERSION);
  } else if (!hasDeliverySettings(db)) {
    db.setDeliverySettings({
      defaultLabel: '3–5 virkedager',
      defaultFee: 99,
    });
  }

  syncCatalogPricing(db);

  if (db.countArticles() === 0) {
    const now = new Date().toISOString();
    for (const article of ARTICLE_SEED) {
      db.upsertArticle({
        ...article,
        createdAt: now,
        updatedAt: now,
      });
    }
    logger.log(`Seeded ${ARTICLE_SEED.length} articles`);
  }
}

/** Apply catalog.json prices/images when version bumps. */
export function syncCatalogPricing(db: DatabaseService) {
  const current = db.getSetting('catalog_pricing_version');
  if (current === CATALOG_PRICING_VERSION) {
    return;
  }

  const data = loadCatalog();
  for (const product of data.products) {
    const existing = db.findProductById(product.id);
    upsertCatalogProduct(db, product, existing);
  }
  db.setSetting('catalog_pricing_version', CATALOG_PRICING_VERSION);
  logger.log(
    `Synced catalog pricing (${CATALOG_PRICING_VERSION}) for ${data.products.length} products`,
  );
}

function upsertCatalogProduct(
  db: DatabaseService,
  product: Product,
  existing: Product | null,
) {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  if (!existing) {
    db.upsertProduct({
      ...product,
      images,
      imageUrl: images[0] ?? product.imageUrl,
      hidden: product.hidden === true,
    });
    return;
  }

  db.upsertProduct({
    ...existing,
    name: product.name,
    description: product.description,
    sizes: product.sizes,
    customSize: product.customSize,
    minQuantity: product.minQuantity,
    maxQuantity: product.maxQuantity,
    quantityStep: product.quantityStep,
    pricingMode: product.pricingMode,
    setupFee: product.setupFee,
    doubleSidedOption: product.doubleSidedOption,
    tiers: product.tiers,
    leadTime: product.leadTime,
    imageUrl: images[0] ?? product.imageUrl,
    images,
    // Preserve storefront visibility and per-product delivery overrides
    hidden: existing.hidden,
    delivery: existing.delivery,
  });
}

function hasDeliverySettings(db: DatabaseService): boolean {
  return Boolean(db.getSetting('delivery'));
}

function loadCatalog(): CatalogFile {
  const catalogPath = resolveCatalogPath();
  const raw = readFileSync(catalogPath, 'utf-8');
  return JSON.parse(raw) as CatalogFile;
}

function resolveCatalogPath(): string {
  const candidates = [
    join(__dirname, '..', 'catalog', 'data', 'catalog.json'),
    join(process.cwd(), 'src', 'catalog', 'data', 'catalog.json'),
    join(process.cwd(), 'dist', 'catalog', 'data', 'catalog.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error('catalog.json not found for database seed');
}
