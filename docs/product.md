# Product specification

## People and responsibilities

Customer: apply for access, sign in after operator approval, retain language/theme preferences, pair a physical device, view its published data and connection health, save one public withdrawal address, request a withdrawal, and view history.

Operator: sign in with password and TOTP, approve/reject customer applications, register/provision devices, publish display state, credit/debit customer accounts with a reason, approve/reject withdrawals, record externally executed payments, and inspect an audit trail.

Device: securely authenticate, show a short-lived pairing code, receive published state, report heartbeat and applied version, retain its last good display during outages with a visible stale indication.

## Initial decisions

- Brand wordmark: Imo. Preserve landing-page composition and marketing content.
- One Next.js deployment with customer routes and `/admin` routes.
- USDT on Ethereum mainnet (ERC20) is the initial withdrawal network. No automatic transaction sending. Additional networks require explicit address/transaction validation and tests.
- One current public withdrawal address per customer. Pending requests retain an immutable destination snapshot.
- Platform balances are funded by audited operator adjustments. Device metrics never credit money.
- Withdrawals accept positive amounts up to available funds with six decimal places; no legacy VIP or seven-day cooldown policy.
- Admin-published metrics are labeled as published information; hardware measurements and account balances are separate.
- Multiple devices per customer; at most one owner per device. Ownership transfer is not self-service in this release.

## Acceptance journey

1. An applicant cannot sign in until an operator approves the application; the approved customer starts with zero balance and zero devices.
2. Operator provisions a unique device identity/secret and credits the customer.
3. Device obtains a pairing code. Customer redeems it exactly once.
4. Operator publishes state. Customer sees it, device applies the same version, operator sees acknowledgement.
5. Customer saves an ERC20 address and requests a withdrawal. Available funds decrease through a reservation.
6. Rejecting releases only that reservation. Approving retains it. Recording payment atomically debits the ledger and closes the request.
7. A paired device earns its configured daily reward only after accumulating 24 hours of authenticated online heartbeat time. Each credit appears in the customer's account activity and the operator audit trail.
7. Refreshes, concurrent requests, retries, and reconnects do not duplicate claims, credits, or payments.

## Preserved capabilities

Language and theme selection, account settings, public marketing layout, contact/purchase inquiry entry points. All new application screens must remain compatible with the translation runtime.

## Excluded

Wallet creation/import, seed storage, MetaMask payments, simulated balances, mining on the ESP32, automatic on-chain verification claims, and automatic production data deletion.
