# Rebuild progress

## Step 1 — specification

Product, architecture, data model, device protocol, phased plan, and release gates documented. Existing code has not yet been made production-ready.

Baseline: customer TypeScript passed; admin TypeScript failed on payout relation typing and missing installed `ethers`. Prior audit found unsigned sessions, non-atomic withdrawals, telemetry-created money, and disconnected firmware rendering.

Existing local edits to the payout helper and withdrawal destination migration were present before rebuilding. Preserve them through the initial restructure; obsolete implementations may then be replaced as part of the authorized rebuild.

## Step 2 — repository consolidation

Customer and administrator routes now live in `apps/platform`; admin routes are namespaced under `/admin` and `/api/admin`. Firmware moved to `firmware/esp32-s3`, historical SQL to `database/legacy`. Landing components and translation/theme runtimes are retained. BrandLogo now renders Imo text. Legacy admin configuration is archived pending final cleanup.

## Step 3 — identity boundary

Replaced editable JSON cookies with random opaque tokens stored hashed in Postgres, separate customer/admin audiences, expiry checks and account/session-version validation. Password/TOTP changes invalidate previous sessions. Added origin checks, atomic rate limits, mandatory admin TOTP, authenticated secret encryption and atomic customer registration. Four authentication primitive tests passed; database/HTTP integration verification follows after the fresh schema is complete.

## Step 4 — accounts and withdrawals

Added an exact-numeric append-only ledger, one public ERC-20 withdrawal address per customer, available/reserved balance calculation, and atomic request/approval/rejection/payment transitions. Removed generated/imported wallets, private-key handling, simulated rewards, and device-created credits. Operators adjust balances and record an externally produced transaction hash through audited database functions.

## Step 5 — devices and product UI

Added random device credentials stored as hashes, expiring single-use pairing codes, version-controlled operator publications, heartbeats, revocation, and shared customer/operator projections. Replaced the hobby dashboard with focused customer and operator workspaces. Firmware now uses HTTPS, NVS provisioning, bounded JSON, reconnect handling, pairing, stale state, and the same v1 publication fields. The marketing page, language selector, and theme remain; image logos were replaced with Imo text.

## Step 6 — verification

Eleven isolated SQL/domain tests pass. Seven real PostgreSQL concurrency and invariant tests pass. The production Next.js webpack build and ESP32-S3 PlatformIO build pass. Browser coverage exercises authentication, operator crediting and publication, device pairing/sync, withdrawal request and payment, forged cookies, origin enforcement, and the retained landing page.

## Step 7 — approved customer onboarding

Customer registration creates a pending application without a session or usable account. Operators review applications from a dedicated console sidebar page. Approval atomically creates the customer login; rejection records a reason and permits reapplication. Password hashes never appear in the operator response.

## Remaining release gates

Flash and inspect the actual ESP32-S3/ST7789 hardware, confirm the project-specific pins and CA certificate, complete staging acceptance behind HTTPS, and rehearse database backup restoration and monitoring alerts. Repository verification cannot certify those external systems.
