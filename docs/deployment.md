# Deployment and operations

Deploy a single Next.js server behind HTTPS. Apply `database/migrations/*.sql` in lexical order before starting the matching application version. Store the service-role key, TOTP encryption key, origin, and operator allowlist in deployment secrets; never put a secret in a public-prefixed variable. The browser receives no database key.

Run the configuration gate in the actual release environment before building:

```bash
pnpm --filter @imo/platform check:production
pnpm --filter @imo/platform test
pnpm --filter @imo/platform typecheck
pnpm --filter @imo/platform lint
pnpm --filter @imo/platform build
```

The edge proxy must replace client-supplied forwarding headers, enforce a 16 KiB request-body limit, redirect HTTP to HTTPS, and preserve the canonical host. Set `APP_ORIGIN` to that exact public HTTPS origin. Monitor `GET /api/health`; HTTP 200 confirms the application can reach its database, while HTTP 503 marks the instance unavailable.

Provision operators with `bootstrap:admin`, using an explicit email and one-time strong password supplied through the process environment. First login forces password replacement and TOTP enrollment. There are no seeded universal passwords. Password and TOTP changes increment the account session version; individual device credentials are revoked separately.

Back up Postgres and test restoration before accepting real balances. Keep ledger/audit retention separate from mutable display data. Monitor failed sign-ins, API failures, database latency, missing heartbeats and pending withdrawals.

Payment workflow: approve, perform transfer externally on the saved request network/address, record the transaction hash. A recorded hash is operator attestation, not independent chain verification.

Before release validate staging with an actual ESP32-S3, confirm pin assignments and TLS trust, rehearse connectivity loss, verify backup restoration, and configure alerts for repeated authentication failures and stale device heartbeats. Do not run archived reset SQL in production.

Review [the security model and residual risks](security.md) as a release gate. Rotate the credentials that were used during development before accepting customers or balances.
