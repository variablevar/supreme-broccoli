# Implementation plan

Commit each reviewable milestone and update README/progress with evidence.

1. Document product, architecture, money invariants, device protocol and release gates.
2. Consolidate into `apps/platform`; preserve marketing/language/theme; replace logo with Imo text; move database and firmware to top-level areas.
3. Repair authentication and server boundaries; add regression tests for tampering, expiry, role isolation and mutation validation.
4. Implement transactional account/withdrawal operations and one withdrawal address; remove wallet custody and demo behavior; test money invariants in an isolated database.
5. Implement device provisioning/pairing/versioned sync and shared customer/admin views; repair firmware rendering and connection state; test protocol and pairing.
6. Run tests, typecheck and production build, add CI, finish setup/operations docs and record remaining hardware/deployment gates.

## Release gates

- Tests and production build pass from documented commands.
- Fresh isolated database installation works; no demo/default administrator passwords.
- Forged/expired/wrong-role sessions fail; ownership isolation holds.
- Concurrent money/pairing operations preserve invariants.
- Actual ESP32-S3 is flashed and completes the acceptance journey over TLS.
- Staging deployment has real secret configuration, backups and monitoring.

Passing repository checks alone is not physical-device or production-deployment certification.
