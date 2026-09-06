# Deployment and operations

Deploy a single Next.js server behind HTTPS. Apply reviewed database migrations before starting the matching application version. Store service-role, session and TOTP encryption keys in deployment secrets; never in public-prefixed variables.

Provision operators using an explicit email and strong password supplied at invocation; require TOTP enrollment. No seeded universal passwords. Rotate session keys to invalidate all browser sessions in an incident; revoke individual device credentials separately.

Back up Postgres and test restoration before accepting real balances. Keep ledger/audit retention separate from mutable display data. Monitor failed sign-ins, API failures, database latency, missing heartbeats and pending withdrawals.

Payment workflow: approve, perform transfer externally on the saved request network/address, record the transaction hash. A recorded hash is operator attestation, not independent chain verification.

Before release validate staging with an actual ESP32-S3, confirm pin assignments and TLS trust, rehearse connectivity loss, and verify backup restoration. Do not run archived reset SQL in production.
