# Data model and accounting

## Entities

- Auth accounts and profiles: password/TOTP identity, profile UID, language/theme. Server-validated sessions link to immutable IDs.
- Devices: unique hardware UID, credential hash, optional owner, revoked flag.
- Pairing codes: device, unique code, expiry and claim status. Claim is atomic.
- Published state: device, versioned content, operator and timestamp.
- Runtime state: device heartbeat, applied version, firmware, uptime and Wi-Fi RSSI.
- Withdrawal address: one per customer, ERC20 public address.
- Ledger: append-only signed USDT credits/debits with operator, reason, and idempotency key.
- Withdrawals: amount, immutable address/network snapshot, status, reviewer, transaction hash and timestamps.
- Audit events: actor, action, target and structured details.

## Money invariants

USDT is represented as decimal strings at the API boundary and exact `numeric(20,6)` in Postgres. Avoid floating-point arithmetic for validation or balance mutation.

Account balance = sum of ledger entries.
Reserved = sum of requested/approved withdrawals.
Available = account balance - reserved.

Account mutations lock the same account row. A withdrawal checks funds and creates its reservation in one transaction. A rejection changes status only. Payment recording requires approved status and writes the debit, payment proof, and audit event in one transaction. A unique request key makes retries safe. Terminal requests cannot be reopened.

Store the withdrawal destination on the request. Editing the saved address never redirects existing withdrawals. Transaction hashes are unique per initial supported network; no batch payout support in v1.

## Database evolution

Maintain one ordered migration path. Legacy schemas are reference material, not the new installation procedure. Production migrations never include demo wipes. Financial and pairing functions are executable only by the trusted backend database role.
