# Imo

Imo connects an operator-managed ESP32-S3 display to its owner's dashboard. Operators publish device information and credit platform accounts. Customers pair devices, save one public withdrawal address, and request withdrawals. Operators pay externally and record the transaction hash.

The operations console includes 13 reusable display presets and transactional group publishing for selected, all active, online, or offline devices. Offline displays apply queued publications when they reconnect.

The existing marketing landing page, language selection, and theme support are retained. Wallet generation, private keys, simulated earnings, and browser payment signing are outside the product.

## Rebuild status

The production foundation is implemented and verified locally. See [progress](PROGRESS_REPORT.md) for completed milestones and the physical-hardware and staging release gates.

## Documentation

- [Product and acceptance criteria](docs/product.md)
- [Architecture and repository structure](docs/architecture.md)
- [Data model and accounting](docs/data-model.md)
- [Device protocol](docs/device-protocol.md)
- [Local development](docs/local-development.md)
- [Testing](TESTING.md)
- [Deployment and operations](docs/deployment.md)
- [Implementation plan](docs/plan.md)

## Target layout

```text
apps/platform/       Next.js customer, admin, marketing, and HTTP API
firmware/esp32-s3/    Physical display firmware
contracts/           Versioned device protocol
database/            Schema, migrations, and isolated test fixtures
 docs/               Product, design, setup, and operations
```

Start with [local development](docs/local-development.md). The new `imo` database schema is isolated from the legacy public schema, so the rebuild does not require an unsafe remote reset.
