import type { CheckoutCustomer, PaymentMethod } from '@inknova/shared';
import { formatOrderReference } from '@inknova/shared';
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
  /** When true, order was placed without online payment (manual invoice). */
  invoiceMode?: boolean;
  siteUrl?: string;
}): string {
  const c = input.customer;
  const invoiceMode = Boolean(input.invoiceMode);
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

  const paymentLabel = invoiceMode
    ? 'Faktura (manuell)'
    : (PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod);

  const bodyHtml = [
    sectionTitle('Ordre'),
    kvTable([
      ['Referanse', `<strong>${escapeHtml(formatOrderReference(input.reference))}</strong>`],
      ['Betaling', escapeHtml(paymentLabel)],
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
    `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b6560;">Trykkfiler ligger vedlagt.</p>`,
  ].join('');

  return wrapEmail({
    kicker: 'Ny ordre',
    title: invoiceMode
      ? 'Ny bestilling – send faktura'
      : 'Bestilling klar til produksjon',
    intro: invoiceMode
      ? `${c.name} har bestilt. Send faktura til kunden. Trykkfiler følger som vedlegg.`
      : `${c.name} har betalt. Trykkfiler følger som vedlegg.`,
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

export type ConfirmationEmailItem = {
  productName: string;
  sizeLabel: string;
  qty: number;
  lineTotal: number;
};

export function orderConfirmationEmailHtml(input: {
  reference: string;
  customerName: string;
  customer: CheckoutCustomer;
  items: ConfirmationEmailItem[];
  deliveryFee: number;
  totalNok: number;
  paymentMethod: PaymentMethod;
  /** When false, hides the payment method row (e.g. before live Vipps). */
  showPayment?: boolean;
  siteUrl?: string;
  contactEmail?: string;
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
    formatNok(item.lineTotal),
  ]);

  const contact = escapeHtml(input.contactEmail ?? 'Kontakt@inknova.no');
  const showPayment = input.showPayment !== false;
  const orderRows: Array<[string, string]> = [
    ['Referanse', `<strong>${escapeHtml(formatOrderReference(input.reference))}</strong>`],
  ];
  if (showPayment) {
    orderRows.push([
      'Betaling',
      escapeHtml(PAYMENT_LABEL[input.paymentMethod] ?? input.paymentMethod),
    ]);
  }

  const bodyHtml = [
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a1a1a;">Hei ${escapeHtml(input.customerName)},</p>`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a1a1a;">Takk for bestillingen! Vi har mottatt betalingen og begynner produksjonen av ordren din.</p>`,
    sectionTitle('Ordre'),
    kvTable(orderRows),
    sectionTitle('Leveringsadresse'),
    kvTable([['Adresse', address]]),
    sectionTitle('Varer'),
    dataTable(['Produkt', 'Antall', 'Sum'], itemRows),
    totalsBlock([
      ['Frakt', formatNok(input.deliveryFee)],
      ['Totalt', formatNok(input.totalNok), true],
    ]),
    `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a;">Vi sender deg en e-post når pakken er sendt. Har du spørsmål? Skriv til <a href="mailto:${contact}" style="color:#1a1a1a;">${contact}</a>.</p>`,
  ].join('');

  return wrapEmail({
    kicker: 'Ordrebekreftelse',
    title: 'Takk for bestillingen!',
    intro: 'Her er en oppsummering av det du har bestilt.',
    bodyHtml,
    siteUrl: input.siteUrl,
  });
}

export function previewOrderConfirmationEmailHtml(siteUrl?: string): string {
  return orderConfirmationEmailHtml({
    reference: '482917',
    customerName: 'Anna Hansen',
    customer: {
      name: 'Anna Hansen',
      email: 'anna@firma.no',
      phone: '+47 900 00 000',
      addressLine1: 'Gateveien 12',
      postalCode: '0150',
      city: 'Oslo',
    },
    items: [
      { productName: 'Visittkort', sizeLabel: '9×5 cm', qty: 100, lineTotal: 499 },
      { productName: 'Flyers', sizeLabel: 'A5', qty: 250, lineTotal: 890 },
    ],
    deliveryFee: 99,
    totalNok: 1488,
    paymentMethod: 'vipps',
    showPayment: false,
    siteUrl,
  });
}

export type ShippedEmailItem = {
  productName: string;
  sizeLabel: string;
  qty: number;
};

export function orderShippedEmailHtml(input: {
  reference: string;
  customerName: string;
  items: ShippedEmailItem[];
  customer: CheckoutCustomer;
  trackingNumber?: string | null;
  siteUrl?: string;
  contactEmail?: string;
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
  ]);

  const contact = escapeHtml(input.contactEmail ?? 'Kontakt@inknova.no');
  const tracking = input.trackingNumber?.trim();
  const orderRows: Array<[string, string]> = [
    ['Referanse', `<strong>${escapeHtml(formatOrderReference(input.reference))}</strong>`],
  ];
  if (tracking) {
    const trackUrl = `https://www.postnord.no/tracking?id=${encodeURIComponent(tracking)}`;
    orderRows.push([
      'Sporing',
      `<a href="${escapeHtml(trackUrl)}" style="color:#1a1a1a;font-weight:600;">${escapeHtml(tracking)}</a>`,
    ]);
  }

  const bodyHtml = [
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a1a1a;">Hei ${escapeHtml(input.customerName)},</p>`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a1a1a;">Gode nyheter — vi har sendt ordren din. Pakken er på vei til leveringsadressen nedenfor.</p>`,
    sectionTitle('Ordre'),
    kvTable(orderRows),
    sectionTitle('Leveringsadresse'),
    kvTable([['Adresse', address]]),
    sectionTitle('Varer'),
    dataTable(['Produkt', 'Antall'], itemRows),
    `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a;">Har du spørsmål om leveringen? Svar på denne e-posten eller skriv til <a href="mailto:${contact}" style="color:#1a1a1a;">${contact}</a>.</p>`,
  ].join('');

  return wrapEmail({
    kicker: 'Ordre sendt',
    title: 'Pakken er på vei!',
    intro: 'Takk for at du handlet hos InkNova.',
    bodyHtml,
    siteUrl: input.siteUrl,
  });
}

export function previewOrderShippedEmailHtml(siteUrl?: string): string {
  return orderShippedEmailHtml({
    reference: '482917',
    customerName: 'Anna Hansen',
    customer: {
      name: 'Anna Hansen',
      email: 'anna@firma.no',
      phone: '+47 900 00 000',
      addressLine1: 'Gateveien 12',
      postalCode: '0150',
      city: 'Oslo',
    },
    items: [
      { productName: 'Visittkort', sizeLabel: '9×5 cm', qty: 100 },
      { productName: 'Flyers', sizeLabel: 'A5', qty: 250 },
    ],
    trackingNumber: '123456789012NO',
    siteUrl,
  });
}

export function previewOrderEmailHtml(siteUrl?: string): string {
  return orderEmailHtml({
    reference: '482917',
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
    invoiceMode: true,
    siteUrl,
  });
}
