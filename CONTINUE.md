# Continue here

Phase C (client design) uses free **Konva + react-konva** — no Polotno.

## Done

### Phase A
- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- Nest API: catalog, contact mail
- Web: catalog, PDP, cart, content pages, i18n

### Phase C
- PDP → `/produkter/:slug/design` (Konva editor)
- Text / image slots / background; stub templates per product
- Google Fonts picker (curated set)
- Export print-ready PDF (3 mm bleed + crop marks) → IndexedDB only
- Cart requires `designPdfKey` (no server file storage)

## Quick start

```bash
pnpm install
pnpm --filter @inknova/shared build
cp apps/api/.env.example apps/api/.env
pnpm dev:api    # :3000
pnpm dev:web    # :5173
```

## Next (Phase B)

- Checkout + Vipps
- On pay: attach PDF from IndexedDB to Copycat mail (buffer only, no disk persist)

Plan: `requirements and assets/inknova_monorepo_mvp_e324daab.plan.md`
