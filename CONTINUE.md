# Continue here (WIP — Phase A)

Paused mid-implementation of Phase A monorepo. Resume from this checkpoint.

## Done

- pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- Shared types (`Product`, `CartItem`, etc.)
- Nest API: `CatalogModule` + JSON `catalog.json` seed (10 products), `MailService` (Nodemailer), `POST /api/contact`, throttling, CORS
- Web foundations: Vite + Tailwind v4, shadcn-style UI kits, i18n (`nb`/`en`), header/footer, `ProductCard`, cart (`localStorage`), API client
- Env examples: `apps/api/.env.example` (local `.env` is gitignored, `MAIL_DRY_RUN=true`)

## Not done yet (finish Phase A)

1. **Web pages / routing** — replace default Vite `App.tsx`; add routes + pages:
   - Home, Alle produkter, Product PDP (IKEA size cards), Handlekurv
   - Om oss, FAQ, Kontakt form, Artikler (+ article detail), Angrerett
2. **Product placeholder images** — `/public/products/*.svg` referenced by catalog
3. **Wire app** — `main.tsx` → router + i18n; remove boilerplate
4. **Build verify** — `pnpm --filter @inknova/shared build`, run api + web, fix TS
5. **Deploy notes** — root README, `ecosystem.config.cjs`, Nginx snippet

## Quick start after pull

```bash
pnpm install
pnpm --filter @inknova/shared build
cp apps/api/.env.example apps/api/.env   # if missing
pnpm dev:api    # :3000
pnpm dev:web    # :5173
```

Plan file (do not edit unless iterating plan): Cursor plans `inknova_monorepo_mvp_e324daab`.
