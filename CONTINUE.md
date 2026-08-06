# Continue here

Phase A monorepo MVP is implemented. Phase C (design) was started with Polotno and rolled back — paid SDK does not fit. Next: free client-side design (e.g. Fabric.js / Konva) when ready.

## Done (Phase A)

- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- Shared types (`Product`, `CartItem`, etc.) — optional `designFileId` / `templateId` reserved for Phase C
- Nest API: catalog JSON seed (10 products), `MailService`, `POST /api/contact`, throttling, CORS
- Web: Vite + Tailwind v4, shadcn-style UI, i18n (`nb`/`en`), layout, all Phase A pages
  - Home, Alle produkter, PDP (IKEA size cards), Handlekurv
  - Om oss, FAQ, Kontakt, Artikler (+ detail), Angrerett
- Product placeholder SVGs in `apps/web/public/products/`
- Deploy notes: root README, `ecosystem.config.cjs`, Nginx sketch

## Quick start

```bash
pnpm install
pnpm --filter @inknova/shared build
cp apps/api/.env.example apps/api/.env   # if missing
pnpm dev:api    # :3000
pnpm dev:web    # :5173
```

## Next (Phase C — free stack)

- Design step before add-to-cart (client-only; no server file storage)
- Free canvas (Fabric.js or Konva) + PDF export with bleed, or PNG/PDF pick into cart via IndexedDB
- `designFileId` / `templateId` required on cart line items when design ships

Plan: `requirements and assets/inknova_monorepo_mvp_e324daab.plan.md`
