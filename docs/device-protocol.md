# Device protocol v1

Transport: HTTPS with certificate verification. Device authentication: `Authorization: Bearer <random device secret>`. The secret is provisioned over a trusted local channel and stored in NVS; the database stores SHA-256 only.

Device requests a pairing code while authenticated, then periodically checks sync. The signed-in customer redeems the code. Backend atomically binds the owner; there is no browser-to-device token handoff.

Sync request includes protocol version 1, firmware version, boot uptime, RSSI and applied publication version. It cannot include earnings or account credits. Sync updates the heartbeat and returns pairing status, current publication/version, server time and retry interval.

Display content includes title, message, activity label/rate and daily/total published USDT values. These are display information, separate from account funds. Payloads are bounded and validated by both server and firmware.

Firmware states: provisioning → connecting → unpaired → paired → stale. Revocation returns to an explicit unavailable state. Keep last valid publication on transient failure; never generate mock values. Use bounded HTTP timeouts, reconnect backoff and structured JSON parsing.

Physical release gate: confirm exact ESP32-S3 board, flash/PSRAM and ST7789 wiring. The repository can supply a reference board configuration; it cannot infer actual pin wiring from a previous `esp32dev` build.
