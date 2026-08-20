import type { CheckoutCustomer, PaymentMethod } from '@inknova/shared';
import {
  dataTable,
  escapeHtml,
  formatNok,
  kvTable,
  messageBox,
  nl2br,
  sectionTitle,
  totalsBlock,
  wrapEmail,
} from './html';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  vipps: 'Vipps',
  card: 'Kort',
};

export function contactEmailHtml(input: {
  name: string;
  email: string;
  message: string;
  siteUrl?: string;
}): string {
  const bodyHtml = [
    sectionTitle('Avsender'),
    kvTable([
      ['Navn', escapeHtml(input.name)],
      [
        'E-post',
        `<a href="mailto:${escapeHtml(input.email)}" style="color:#1a1a1a;">${escapeHtml(input.email)}</a>`,
      ],
      ['Personvernsamtykke', 'ja'],
    ]),
    sectionTitle('Melding'),
    messageBox(nl2br(input.message)),
  ].join('');

  return wrapEmail({
    kicker: 'Kontaktskjema',
    title: 'Ny henvendelse fra nettsiden',
    intro: 'Svar direkte på denne e-posten for å svare kunden.',
    bodyHtml,
    siteUrl: input.siteUrl,
  });
}

export type OrderEmailItem = {
  productName: string;
  sizeLabel: string;
  qty: number;
  lineTotal: number;
  designFileName: string;
};

export function orderEmailHtml(input: {
  reference: string;
  customer: CheckoutCustomer;
  items: OrderEmailItem[];
  deliveryFee: number;
  totalNok: number;
  paymentMethod: PaymentMethod;
  siteUrl?: string;
}): string {
  const c = input.customer;
  const address = [
    escapeHtml(c.addressLine1),
    c.addressLine2 ? escapeHtml(c.addressLine2) : '',
    `${escapeHtml(c.postalCode)} ${escapeHtml(c.city)}`,
  ]
    .filter(Boolean)
    .join('<br/>');

  const itemRows = input.items.map((item) => [
    `<strong>${escapeHtml(item.productName)}</strong><br/><span style="color:#6b6560;font-size:13px;">${escapeHtml(item.sizeLabel)}</span>`,
    String(item.qty),
    escapeHtml(item.designFileName),
    formatNok(item.lineTotal),
  ]);

  const bodyHtml = [
    sectionTitle('Ordre'),
    kvTable([
      ['Referanse', `<strong>${escapeHtml(input.reference)}</strong>`],
      ['Betaling', escapeHtml(PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod)],
    ]),
    sectionTitle('Kunde'),
    kvTable([
      ['Navn', escapeHtml(c.name)],
      [
        'E-post',
        `<a href="mailto:${escapeHtml(c.email)}" style="color:#1a1a1a;">${escapeHtml(c.email)}</a>`,
      ],
      [
        'Telefon',
        `<a href="tel:${escapeHtml(c.phone)}" style="color:#1a1a1a;">${escapeHtml(c.phone)}</a>`,
      ],
    ]),
    sectionTitle('Levering'),
    kvTable([['Adresse', address]]),
    sectionTitle('Produkter'),
    dataTable(['Produkt', 'Antall', 'Fil', 'Sum'], itemRows),
    totalsBlock([
      ['Frakt', formatNok(input.deliveryFee)],
      ['Totalt', formatNok(input.totalNok), true],
    ]),
    `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b6560;">PDF-filer ligger vedlagt.</p>`,
  ].join('');

  return wrapEmail({
    kicker: 'Ny ordre',
    title: 'Bestilling klar til produksjon',
    intro: `${c.name} har betalt. Trykkfiler følger som vedlegg.`,
    bodyHtml,
    siteUrl: input.siteUrl,
  });
}

export function previewContactEmailHtml(siteUrl?: string): string {
  return contactEmailHtml({
    name: 'Anna Hansen',
    email: 'anna@firma.no',
    message:
      'Hei!\n\nVi trenger 200 visittkort og 500 flyers til et arrangement i Oslo. Kan dere gi et tilbud med levering neste uke?',
    siteUrl,
  });
}

export function previewOrderEmailHtml(siteUrl?: string): string {
  return orderEmailHtml({
    reference: 'ink-m8k2p-a1b2',
    customer: {
      name: 'Anna Hansen',
      email: 'anna@firma.no',
      phone: '+47 900 00 000',
      addressLine1: 'Gateveien 12',
      postalCode: '0150',
      city: 'Oslo',
    },
    items: [
      {
        productName: 'Visittkort',
        sizeLabel: '9×5 cm',
        qty: 100,
        lineTotal: 499,
        designFileName: 'visittkort-front.pdf',
      },
      {
        productName: 'Flyers',
        sizeLabel: 'A5',
        qty: 250,
        lineTotal: 890,
        designFileName: 'flyer-a5.pdf',
      },
    ],
    deliveryFee: 99,
    totalNok: 1488,
    paymentMethod: 'vipps',
    siteUrl,
  });
}
