# Testing

The default test workflow is isolated and never sends cryptocurrency or wipes a remote database.

Required coverage: session tampering/expiry/audience; customer/admin/device authorization; exact decimal amount validation; ownership; pairing expiry/replay; withdrawal reservation/rejection/payment transitions; duplicate requests; concurrent balance mutations; shared published state; empty/error dashboard states.

Run the repository checks from the root:

```bash
pnpm --filter @imo/platform test
pnpm typecheck
pnpm build
pio run --project-dir firmware/esp32-s3
```

The unit suite uses in-process PGlite. The real PostgreSQL and browser suite uses the disposable Docker stack documented in `docs/local-development.md`; it covers the customer/operator journey and device authentication over HTTP. TypeScript checking and a production build supplement behavior tests; none proves hardware operation.

Manual hardware acceptance: provision identity and Wi-Fi, pair from customer dashboard, publish from admin, observe identical version/content on device, disconnect/reconnect Wi-Fi, revoke credential, and confirm no mock metrics or unauthorized access.
