# IMNOSHI — Progress Report

## Phase 1 (complete) — see top of file

The original /customer/admin pairing, role model, withdrawal flow, telemetry
ingest, captive portal, and audit log all shipped and verified (tsc clean for
admin; pre-existing framer-motion / @noble typings only on the web app). See
git history / README.md for the migration list, seed.sql, and the
seed-clerk.mjs script.

## Phase 2 (in progress) — server-driven firmware

### What changed in the firmware (imnoshi-module/)

You updated `src/main.cpp` to a ST7789 (170×320, portrait) build with a custom
Slabo16 bitmap font (`include/Slabo16.h`, plus a duplicate `Ubuntu16.h` kept
in place), WiFiManager-based provisioning, and a 4-page rotating display
(Overview / Network & Power / Activity / Wallet & Revenue).

That rewrite wiped my Phase-1 NVS / telemetry / pairing code. Everything from
this phase adds on top of your existing pages, preserves the rendering, and
only changes:

* the data source (`loadMockMetrics()` -> `applyServerState()` driven by
  `GET /api/devices/state` polled every 15 s with `Authorization: Bearer
  <claim_token>`),
* a 5th page shown only when NVS `paired == false` after WiFiManager
  succeeds ("PAIRING" — shows the 6-character code),
* NVS keys: `w_ssid`, `w_pass`, `token`, `devid`, `paired`.

### New endpoints

* `GET  /api/devices/state`  — bearer-token. Returns the full `DeviceMetrics`
  shape (uid, name, online, status, network, power, mining, wallet) joined
  from `monitor_devices` + `users` + `wallets`.
* `POST /api/devices/config` — bearer-token. Device reports its own runtime
  config (brightness, current page index). Logged to a new
  `device_runtime_state` table for diagnostics.

### Admin side (imnoshi-admin)

* `GET /admin/api/devices/[id]/command` command set extended with:
  `set_currency`, `set_mining_display`, `set_refresh_ms`,
  `set_currency_shuffle`, `set_paired_page_text`.
* Per-device command panel in `(admin)/devices` gains those commands.
* New migration: `20260907093004_device_state_overrides.sql` adds
  `device_state_overrides` (per-device display overrides) and
  `device_runtime_state` (firmware self-reports).

### What's deliberately NOT in scope

* I am not rewriting your page system or replacing the Slabo16 font.
* I am not removing WiFiManager.
* The device still uses HTTP for telemetry. If you front it with a TLS
  reverse-proxy (or operate it on a closed LAN) it's fine; flagging it
  explicitly in case you want to pin certificate later.
* `include/Ubuntu16.h` is a perfect duplicate of `Slabo16.h` (same namespace,
  same data, same `#define UBUNTU16_H`). I'm leaving both files in place
  for now — once you've confirmed the duplicate is intentional / safe to
  delete, we can drop one.
