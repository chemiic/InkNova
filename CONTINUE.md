# Continue here

## Done

### Phase A
- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- Nest API: catalog, contact mail
- Web: catalog, PDP, cart, content pages, i18n

### Phase C
- PDP → `/produkter/:slug/design` (Konva editor **or** upload own PDF/PNG)
- Export / upload → print-ready PDF → IndexedDB only
- Cart requires `designPdfKey`

### Phase B
- Checkout `/kasse` (address + Vipps/card)
- `POST /api/orders` multipart: order JSON + PDF buffers (no disk persist)
- Copycat mail with attachments (`COPYCAT_TO`)
- Vipps ePayment when keys set and `PAYMENT_DRY_RUN=false`
- Default local: `PAYMENT_DRY_RUN=true` → complete immediately + mail dry-run

## Quick start

```bash
pnpm install
pnpm --filter @inknova/shared build
cp apps/api/.env.example apps/api/.env
pnpm dev:api    # :3000
pnpm dev:web    # :5173
```

## Next

- Real Vipps test keys in `.env` (`PAYMENT_DRY_RUN=false`)
- Optional: persist orders to SQLite when admin panel arrives
- Deploy polish (Nginx body size for PDF uploads)

Plan: `requirements and assets/inknova_monorepo_mvp_e324daab.plan.md`
