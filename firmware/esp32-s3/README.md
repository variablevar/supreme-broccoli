# Imo ESP32-S3 firmware

The display consumes operator publications over authenticated HTTPS. It never creates account credits or random metrics.

## Reference hardware

ESP32-S3 DevKitC-1, ST7789 170x320 portrait display. Reference pins: MOSI 11, SCLK 12, CS 10, DC 9, reset 8. Connect power/backlight according to your display specifications. Confirm board model, flash/PSRAM and pins before upload; these are a reference configuration, not a claim about your physical wiring.

```sh
cd firmware/esp32-s3
pio run
pio run --target upload
pio device monitor
```

## Provisioning

1. Register the device under `/admin/devices` and save its one-time credential.
2. Connect the device to Wi-Fi using its `Imo-Setup-…` access point. The portal is nonblocking and times out after three minutes. Restart to reopen setup if needed.
3. Obtain the trusted root CA PEM for your deployment's HTTPS certificate from your certificate authority. Do not use an arbitrary certificate copied from an untrusted server.
4. Send one JSON line over USB serial (115200 baud):

```json
{
  "baseUrl": "https://imo.example",
  "token": "<43-character device credential>",
  "caPem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
}
```

The device stores configuration in NVS and reboots. Tokens are never printed. It requires network time for certificate validation; outbound NTP must be available. No HTTP or insecure TLS fallback exists.

5. Enter the six-character code displayed by the device in the signed-in customer dashboard. The code expires after 15 minutes and is refreshed through the device API.
6. Publish content from admin. The next sync applies it; the following sync acknowledges the version. The landscape display rotates through account overview, network and power, mining or staking, and wallet/revenue pages every five seconds. Wallet address, account balance and average daily reward come from platform records; the mining profile, capacity and power figures come from the operator publication.

## Recovery

Loss of network keeps the last cached publication and marks it stale. The web dashboard marks a missing heartbeat offline after 40 seconds. Retry backoff grows from 15 seconds to two minutes. A rejected credential displays REVOKED and requires operator reprovisioning. To factory-reset over trusted USB, send `{"reset":true}`; this clears server credentials, cached display and Wi-Fi settings.

Cached publications contain no private wallet keys. NVS credentials are not hardware-encrypted by this reference build; production hardware release must decide secure boot, flash encryption and physical access requirements.

## Validation

`pio run` checks the reference build. Physical display, TLS provisioning, power loss/reconnect, and pin assignments require bench acceptance. See the protocol contract and repository testing guide.
