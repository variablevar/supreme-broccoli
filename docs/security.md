# Security

## Trust boundaries

The Next.js server is the only Supabase client. It holds the service-role credential and exposes narrow, validated HTTP routes. Browser roles have no grants in the `imo` schema. Customers, operators, and devices use separate credentials and authorization paths.

Customer and operator cookies contain random 256-bit opaque values. PostgreSQL stores only SHA-256 token hashes. Sessions have an audience, authentication stage, account version, and expiry. Cookies are HTTP-only, SameSite=Lax, and Secure in production. Password or TOTP changes increment the account session version. Operators must enroll TOTP; customer TOTP is optional.

Registration applications accept only `@imnoshi.com` addresses, enforced in both the API and PostgreSQL. A pending or rejected applicant sees the approval/support message only after providing the password hash associated with that application, which avoids exposing application status to someone who knows only an email address.

Failed customer and operator authentication attempts are written to the append-only login security log. Records include the attempted email, authentication stage/outcome, sanitized IP and provider-supplied country/region headers, user agent, and time. Attempted passwords and TOTP values are never stored. Geographic fields are trustworthy only when the deployment proxy removes client-supplied forwarding headers and supplies its own verified values.

Unsafe browser requests must carry the exact `APP_ORIGIN`. Missing and cross-origin requests are rejected. Device endpoints are exempt only when the request path is under `/api/v1/device/` and carries a correctly shaped bearer credential; the credential is then hash-matched against a non-revoked device.

The database uses RLS on every application table. Anonymous and authenticated Supabase roles have no table grants or executable application functions. Ledger and audit records are append-only. Balance adjustment, withdrawal completion, publication, pairing, and daily rewards execute in database transactions.

Firmware accepts only HTTPS origins, requires a provisioned PEM root CA, verifies server certificates, bounds response size, validates response fields, and never prints its device credential.

## Operational requirements

- Keep Supabase service-role, database, TOTP encryption, device, and initial operator credentials in a managed secret store.
- Rotate every credential previously copied into chat, terminals, tickets, or screenshots.
- Terminate TLS at a trusted proxy and redirect HTTP to HTTPS.
- Configure the proxy to replace forwarded IP headers and reject request bodies over 16 KiB before they reach Next.js.
- Alert on repeated security events by IP, attempted email, or region, and set a retention period for this personal data.
- Restrict database network access, enable Supabase MFA, and review service-role use.
- Back up PostgreSQL, test restoration, and alert on authentication failures, lockouts, reward anomalies, stale heartbeats, and pending withdrawals.
- Retain audit and ledger records according to the applicable financial and privacy policy.
- Verify the ESP32-S3 board, display pins, CA rotation, and recovery flow on physical hardware.

Run `pnpm --filter @imo/platform check:production` in the release environment. It validates required production configuration without printing secrets. Then run every command in [TESTING.md](../TESTING.md).

## Residual risks

Recorded withdrawal transaction hashes are operator attestations; the platform does not currently verify them against a blockchain node. Network and power figures shown on devices are operator publications until physical sensors or a trusted telemetry source are integrated. The static CSP permits inline scripts and styles for compatibility with the current statically generated Next.js landing page. Moving all pages to dynamic rendering would allow nonce-based CSP at additional runtime cost.
