# Imo

Imo connects an operator-managed ESP32-S3 display to its owner's dashboard. Operators publish device information and credit platform accounts. Customers pair devices, save one public withdrawal address, and request withdrawals. Operators pay externally and record the transaction hash.

The existing marketing landing page, language selection, and theme support are retained. Wallet generation, private keys, simulated earnings, and browser payment signing are outside the product.

## Rebuild status

Implementation is underway. See [progress](PROGRESS_REPORT.md) for verified milestones and remaining release gates. Do not treat the legacy progress claims as release evidence.

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
 database/           Schema, migrations, and isolated test fixtures
 docs/               Product, design, setup, and operations
```

Runtime setup instructions will be updated with each implementation milestone. No remote database reset is required to restructure this repository.
