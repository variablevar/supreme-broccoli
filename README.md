# Supreme Broccoli

Imnoshi is a multi-project quant platform comprising a customer dashboard, an administrative console, and an ESP32 display module.

## Projects

| Project | Description | Default port |
| --- | --- | --- |
| `imnoshi-web` | Customer-facing dashboard for wallets, staking, rewards, and withdrawals. | 3000 |
| `imnoshi-admin` | Administrative console for managing the platform. | 3001 |
| `imnoshi-module` | PlatformIO firmware for an ESP32 device with a TFT display. | N/A |

## Prerequisites

- Node.js 18.17 or newer
- npm
- PlatformIO Core or the PlatformIO VS Code extension for the device firmware

## Run The Web Apps

Install dependencies and start the customer dashboard:

```bash
cd imnoshi-web
npm install
npm run dev
```

Open `http://localhost:3000`.

In another terminal, start the admin console:

```bash
cd imnoshi-admin
npm install
npm run dev
```

Open `http://localhost:3001`.

Both applications provide these commands:

```bash
npm run build
npm run start
npm run typecheck
npm run lint
```

## Environment Configuration

The Next.js apps use Clerk for authentication and Supabase for data. Create a `.env.local` file in each web project and provide the required Clerk and Supabase values before running the apps. Environment files are intentionally excluded from Git.

## Device Firmware

The ESP32 module targets the `esp32dev` board, uses Arduino, and renders device status on a TFT display through `TFT_eSPI`.

```bash
cd imnoshi-module
pio run
pio run --target upload
pio device monitor
```

The serial monitor runs at `115200` baud. Configure the TFT driver and pins in `imnoshi-module/include/User_Setup.h` for the connected hardware.

## Repository Layout

```text
imnoshi-web/       Customer Next.js application
imnoshi-admin/     Admin Next.js application
imnoshi-module/    ESP32 PlatformIO firmware
```

## Git Hygiene

The root `.gitignore` excludes dependency folders, Next.js output, local environment files, logs, and PlatformIO build artifacts. Commit lockfiles and source configuration so development environments remain reproducible.