# Local development

Requirements: Node 22, pnpm 9, Docker for integration tests, and PlatformIO for firmware. Never use a production database for automated tests.

The rebuild consolidates web and admin into `apps/platform`. Local customer URL is `http://localhost:3000`; admin is `/admin`. Environment variables belong in the platform `.env.local`, not in source control.

Install packages and create local configuration:

```bash
pnpm install
cp apps/platform/.env.example apps/platform/.env.local
```

Apply `database/migrations/*.sql` in lexical order to a fresh Supabase project, then configure the URL, service-role key, a dedicated 64-character hexadecimal `TOTP_ENCRYPTION_KEY`, and `APP_ORIGIN`. Create the first operator only after migrations are installed:

```bash
ADMIN_EMAIL=operator@example.com ADMIN_PASSWORD='a-unique-strong-password' pnpm --filter @imo/platform bootstrap:admin
pnpm dev
```

The customer UI is at `/dashboard`, the operator console is at `/admin`, and the retained marketing site is `/`. Operator first login requires a new password and TOTP enrollment. Customers self-register and may enable TOTP from Settings.

Use the disposable integration stack for database and browser tests:

```bash
docker compose -f infra/compose.test.yml up -d --wait
pnpm --filter @imo/platform exec node scripts/setup-test-db.mjs
pnpm --filter @imo/platform test:e2e
docker compose -f infra/compose.test.yml down -v
```

Legacy database credentials are never used by these scripts. `setup-test-db.mjs` has a fixed localhost database URL and is the only script that drops a schema.
