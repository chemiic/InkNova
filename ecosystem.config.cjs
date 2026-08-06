/**
 * pm2 ecosystem for InkNova API on a VPS.
 * Run from repo root after `pnpm build`:
 *   pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'inknova-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Prefer loading secrets from apps/api/.env via Nest ConfigModule
      // rather than putting SMTP_PASS here.
    },
  ],
}
