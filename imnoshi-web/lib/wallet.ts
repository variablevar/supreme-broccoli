// Server-side UID generation. Wallet addresses come from the user's own
// Web3 wallet (see lib/web3.ts) — nothing is generated client-side anymore.
export function generateUID(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const part = (arr: number[]) =>
    arr.map((b) => (b % 36).toString(36).toUpperCase()).join('');
  const all = Array.from(bytes);
  return `IMN-${part(all.slice(0, 4))}-${part(all.slice(4))}`;
}
