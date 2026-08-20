export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

export function formatNok(amount: number): string {
  return `${amount.toLocaleString('nb-NO')} kr`;
}

const COLORS = {
  page: '#f3efe9',
  card: '#ffffff',
  ink: '#1a1a1a',
  muted: '#6b6560',
  line: '#e6e1da',
  header: '#0a0a0a',
  accent: '#c45c26',
};

export type EmailLayoutInput = {
  /** Small uppercase label above the title, e.g. "Ny ordre" */
  kicker: string;
  title: string;
  /** Optional one-line intro under the title */
  intro?: string;
  /** Inner HTML (already escaped / built with helpers) */
  bodyHtml: string;
  footerNote?: string;
  siteUrl?: string;
};

/**
 * Table-based layout that holds up in Outlook / Gmail / Apple Mail.
 * Pass only the inner body — header/footer stay consistent.
 */
export function wrapEmail(input: EmailLayoutInput): string {
  const site = input.siteUrl?.replace(/\/$/, '') ?? 'https://inknova.no';
  const intro = input.intro
    ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:${COLORS.muted};">${escapeHtml(input.intro)}</p>`
    : '';
  const footer = input.footerNote
    ? escapeHtml(input.footerNote)
    : 'InkNova · trykk og storformat';

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.card};border:1px solid ${COLORS.line};">
          <tr>
            <td style="background:${COLORS.header};padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#ffffff;">InkNova</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.accent};">${escapeHtml(input.kicker)}</p>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;font-weight:600;color:${COLORS.ink};">${escapeHtml(input.title)}</h1>
              ${intro}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 28px;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid ${COLORS.line};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.muted};">
              ${footer}<br/>
              <a href="${escapeHtml(site)}" style="color:${COLORS.ink};text-decoration:underline;">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function sectionTitle(text: string): string {
  return `<p style="margin:22px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.muted};">${escapeHtml(text)}</p>`;
}

/** Label / value pairs as a compact definition list. */
export function kvTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:7px 12px 7px 0;width:140px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.muted};">${escapeHtml(label)}</td>
          <td style="padding:7px 0;font-size:15px;line-height:1.45;color:${COLORS.ink};">${value}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>`;
}

export function dataTable(headers: string[], rows: string[][]): string {
  const head = headers
    .map(
      (h, i) =>
        `<th align="${i === headers.length - 1 ? 'right' : 'left'}" style="padding:8px 8px 8px ${i === 0 ? '0' : '8px'};font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};font-weight:600;border-bottom:1px solid ${COLORS.line};">${escapeHtml(h)}</th>`,
    )
    .join('');
  const body = rows
    .map((cols) => {
      const cells = cols
        .map(
          (c, i) =>
            `<td align="${i === cols.length - 1 ? 'right' : 'left'}" style="padding:10px 8px 10px ${i === 0 ? '0' : '8px'};font-size:14px;color:${COLORS.ink};border-bottom:1px solid ${COLORS.line};vertical-align:top;">${c}</td>`,
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function totalsBlock(rows: Array<[string, string, boolean?]>): string {
  const body = rows
    .map(([label, value, strong]) => {
      const weight = strong ? '700' : '400';
      const size = strong ? '16px' : '14px';
      const pad = strong ? '10px 0 0' : '4px 0';
      return `<tr>
        <td style="padding:${pad};font-family:Arial,Helvetica,sans-serif;font-size:${size};font-weight:${weight};color:${COLORS.ink};">${escapeHtml(label)}</td>
        <td align="right" style="padding:${pad};font-size:${size};font-weight:${weight};color:${COLORS.ink};">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid ${COLORS.line};">${body}</table>`;
}

export function messageBox(html: string): string {
  return `<div style="margin-top:4px;padding:14px 16px;background:${COLORS.page};border:1px solid ${COLORS.line};font-size:15px;line-height:1.55;color:${COLORS.ink};">${html}</div>`;
}
