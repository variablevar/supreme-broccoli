# Testing

The default test workflow is isolated and never sends cryptocurrency or wipes a remote database.

Required coverage: session tampering/expiry/audience; customer/admin/device authorization; exact decimal amount validation; ownership; pairing expiry/replay; withdrawal reservation/rejection/payment transitions; duplicate requests; concurrent balance mutations; shared published state; empty/error dashboard states.

Implementation milestones add executable commands here. TypeScript checking and a production build supplement behavior tests; neither proves hardware operation.

Manual hardware acceptance: provision identity and Wi-Fi, pair from customer dashboard, publish from admin, observe identical version/content on device, disconnect/reconnect Wi-Fi, revoke credential, and confirm no mock metrics or unauthorized access.
