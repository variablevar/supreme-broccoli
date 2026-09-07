# Imo platform

This is the single Next.js application for the marketing site, customer dashboard, operator console, and authenticated ESP32-S3 API. The source of truth for architecture and setup is the repository [README](../../README.md) and [local development guide](../../docs/local-development.md).

## Commands

```bash
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
pnpm check:production
```

Run commands from this directory, or use `pnpm --filter @imo/platform <command>` from the repository root. Browser integration tests require the disposable stack described in [TESTING.md](../../TESTING.md).

## Security model

Browser clients never receive the Supabase service-role credential. Customer and operator sessions are opaque, hashed in PostgreSQL, audience-bound, expiring, and invalidated by password or TOTP changes. Operator access requires a database account, TOTP enrollment, and the deployment allowlist when configured. Device credentials are random bearer secrets stored as SHA-256 hashes; firmware requires HTTPS and a provisioned root CA.

All application tables use RLS and grant access only to the backend service role. Financial changes use append-only ledger records and transactional database functions. Unsafe browser mutations require the canonical `Origin`; authenticated device routes use bearer credentials instead.

See [security](../../docs/security.md) and [deployment](../../docs/deployment.md) before release. No demo accounts, universal passwords, wallet private keys, or seed balances belong in a production installation.
