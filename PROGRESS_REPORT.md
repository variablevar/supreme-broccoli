# Rebuild progress

## Step 1 — specification

Product, architecture, data model, device protocol, phased plan, and release gates documented. Existing code has not yet been made production-ready.

Baseline: customer TypeScript passed; admin TypeScript failed on payout relation typing and missing installed `ethers`. Prior audit found unsigned sessions, non-atomic withdrawals, telemetry-created money, and disconnected firmware rendering.

Existing local edits to the payout helper and withdrawal destination migration were present before rebuilding. Preserve them through the initial restructure; obsolete implementations may then be replaced as part of the authorized rebuild.

## Outstanding

Repository consolidation, authentication, transaction-safe accounting, device lifecycle, UI simplification, automated tests/CI, production build, isolated database verification, physical hardware and staging acceptance.
