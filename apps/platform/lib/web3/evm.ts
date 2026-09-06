// EVM helpers. No ethers / viem / wagmi dependency on purpose --
// ethers pulls a lot of indirect deps and we only need:
//
//   * keccak256 (function selector + topic hashing)
//   * ABI-encoded `transfer(address,uint256)` and `balanceOf(address)`
//   * public RPC reads (eth_call, eth_getBalance)
//
// We use `@noble/hashes` (already in package.json) for keccak256.

import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

// USDT ERC-20 on Ethereum mainnet.
export const USDT_ETHEREUM = {
  symbol: 'USDT',
  chain: 'ethereum',
  chainId: 1,
  decimals: 6,
  // Canonical Tether USD contract on Ethereum mainnet.
  contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
} as const;

// Native ETH sentinel (no contract address).
export const NATIVE_ETH = {
  symbol: 'ETH',
  chain: 'ethereum',
  chainId: 1,
  decimals: 18,
  contract: '0x0000000000000000000000000000000000000000',
} as const;

export const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2e068a378daee74f4d5b69c5d8e9f3eb5d2c3e3e3a1f7a';

function isHexAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function normalizeAddress(addr: string): string | null {
  if (!addr) return null;
  const a = addr.trim();
  if (!isHexAddress(a)) return null;
  return a.toLowerCase();
}

/** ABI-encode `balanceOf(address)` -- 4-byte selector + 32-byte padded arg. */
export function encodeBalanceOf(addr: string): string {
  const norm = normalizeAddress(addr);
  if (!norm) throw new Error('invalid address');
  // Strip the 0x prefix and pad to 32 bytes.
  const padded = '0'.repeat(24) + norm.slice(2);
  return ERC20_BALANCE_OF_SELECTOR + padded;
}

/** Human-readable token amount from raw integer (token decimals). */
export function formatUnits(rawBigInt: bigint, decimals: number): string {
  if (rawBigInt === 0n) return '0';
  const base = 10n ** BigInt(decimals);
  const whole = rawBigInt / base;
  const frac = rawBigInt % base;
  if (frac === 0n) return whole.toString();
  // Trim trailing zeros from the fractional part for readability.
  let fracStr = frac.toString().padStart(decimals, '0');
  fracStr = fracStr.replace(/0+$/, '');
  return fracStr.length > 0 ? `${whole.toString()}.${fracStr}` : whole.toString();
}

export function parseUnits(human: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(human)) throw new Error('invalid amount');
  const [w, f = ''] = human.split('.');
  const fracPadded = (f + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(w) * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
}

export function topicToAddress(topic: string): string {
  // ERC-20 Transfer event topic[1] is the 32-byte padded `from` address,
  // topic[2] is `to`. Strip leading zeros and prefix 0x.
  if (!/^0x[0-9a-fA-F]{64}$/.test(topic)) return '';
  return '0x' + topic.slice(-40).toLowerCase();
}

export function topicToUint(topic: string): bigint {
  if (!/^0x[0-9a-fA-F]{64}$/.test(topic)) return 0n;
  return BigInt(topic);
}

/** keystore-friendly keccak256 of a UTF-8 string. */
export function keccak256(text: string): string {
  const data = new TextEncoder().encode(text);
  return '0x' + bytesToHex(keccak_256(data));
}

/** 4-byte function selector from a canonical signature. */
export function functionSelector(sig: string): string {
  return keccak256(sig).slice(0, 10);
}

/**
 * Verify that an Ethereum address is checksummed. We don't strictly
 * enforce this — we accept any valid hex — but checksum mismatches
 * are surfaced in the UI.
 */
export function isLikelyChecksummed(addr: string): boolean {
  if (!isHexAddress(addr)) return false;
  // Mixed case => probably checksummed. All-lower or all-upper => no.
  const body = addr.slice(2);
  return /[A-F]/.test(body) && /[a-f]/.test(body);
}

/**
 * Minimal client-side wallet connector. Returns the first account
 * reported by `window.ethereum` (MetaMask, Rabby, etc.). Throws if
 * the user has no EIP-1193 wallet installed.
 */
export async function connectInjectedWallet(): Promise<string> {
  const w = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
  if (!w) {
    throw new Error(
      'No EIP-1193 wallet detected. Install MetaMask or paste an address manually.'
    );
  }
  const accounts = await w.request({ method: 'eth_requestAccounts' });
  const first = accounts?.[0];
  if (!first || !isHexAddress(first)) {
    throw new Error('Wallet did not return a valid Ethereum address.');
  }
  return first.toLowerCase();
}
