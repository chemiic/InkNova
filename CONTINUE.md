# Continue here

Phase A monorepo MVP is implemented. Next work is Phase C (design/upload) when ready — see plan.

## Done (Phase A)

- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- Shared types (`Product`, `CartItem`, etc.)
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

## Next (Phase C — not started)

- Design/upload step before add-to-cart (PDF/PNG + templates)
- `designFileId` / `templateId` required on cart line items

Plan: `requirements and assets/inknova_monorepo_mvp_e324daab.plan.md`
