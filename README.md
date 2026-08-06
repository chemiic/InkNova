# InkNova

Monorepo for the InkNova print shop: Vite/React storefront + NestJS API + shared types.

**Phase A (current):** catalog, PDP, cart (localStorage), contact form → email, content pages.  
**Later:** design (C, free client editor — not Polotno), Vipps checkout (B).

## Structure

```
apps/web          Vite + React + Tailwind + i18n (nb/en)
apps/api          NestJS — catalog + contact mail
packages/shared   Product / CartItem types
```

## Local setup

Requirements: Node ≥ 20, [pnpm](https://pnpm.io) 10+.

```bash
pnpm install
pnpm --filter @inknova/shared build
cp apps/api/.env.example apps/api/.env
pnpm dev:api    # http://localhost:3000/api
pnpm dev:web    # http://localhost:5173  (proxies /api → API)
```

Or both: `pnpm dev`.

### API env (`apps/api/.env`)

| Variable | Notes |
|----------|--------|
| `PORT` | default `3000` |
| `CORS_ORIGIN` | e.g. `http://localhost:5173` |
| `MAIL_DRY_RUN` | `true` locally — logs mail instead of sending |
| `SMTP_HOST` | `send.one.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` / `SMTP_PASS` | mailbox credentials |
| `CONTACT_TO` | `Kontakt@inknova.no` |

Prices, delivery and lead time come **only** from `GET /api/products` — never hardcode NOK in the UI.

## Build

```bash
pnpm build
```

Outputs: `packages/shared/dist`, `apps/api/dist`, `apps/web/dist`.

## Deploy (VPS: Nginx + pm2)

You bring the VPS. This repo includes `ecosystem.config.cjs` and the Nginx sketch below.

1. Point DNS **A** for `inknova.no` at the VPS. Do **not** change MX (mail stays on one.com).
2. Clone, install, set production `.env` on the server (`MAIL_DRY_RUN=false`, real SMTP, `CORS_ORIGIN=https://inknova.no`).
3. Build, then start API with pm2:

```bash
pnpm install --frozen-lockfile
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

4. Serve the SPA from `apps/web/dist` and proxy `/api` to the Nest process.

### Nginx sketch

```nginx
server {
  listen 443 ssl http2;
  server_name inknova.no www.inknova.no;

  # ssl_certificate / etc. (e.g. Let's Encrypt)

  root /var/www/inknova/apps/web/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Adjust `root` to your deploy path. TLS via certbot is recommended.

## Scripts

| Script | What |
|--------|------|
| `pnpm dev` / `dev:web` / `dev:api` | Local development |
| `pnpm build` | shared → api → web |
| `pnpm lint` | Typecheck all packages |
