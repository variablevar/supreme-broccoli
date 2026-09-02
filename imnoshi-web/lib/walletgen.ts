// Real wallet creation: one BIP39 mnemonic -> addresses on 7 chains.
// Runs entirely in the browser — the mnemonic and keys never leave the client.
// Standard derivation paths, so the phrase imports into MetaMask/Phantom/etc.

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/ripemd160.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { bech32 } from '@scure/base';
import { HDKey as Ed25519HDKey } from 'micro-ed25519-hdkey';
import bs58 from 'bs58';

export interface DerivedAddress {
  symbol: string;
  chain: string;
  address: string;
  path: string;
}

export interface DerivedWalletSet {
  mnemonic: string;
  addresses: DerivedAddress[];
}

export function createMnemonic(): string {
  return generateMnemonic(wordlist, 128); // 12 words
}

export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

// ---------- helpers ----------

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

function toChecksumEvmAddress(addrBytes: Uint8Array): string {
  const lower = bytesToHex(addrBytes);
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)));
  let out = '0x';
  for (let i = 0; i < lower.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

/** BIP84-style native segwit (bech32) address from a compressed pubkey. */
function toBech32Address(pubkey: Uint8Array, hrp: 'bc' | 'ltc'): string {
  const program = hash160(pubkey);
  return bech32.encode(hrp, [0, ...bech32.toWords(program)]);
}

/** Base58Check address (used by DOGE and TRX). */
function toBase58Check(prefix: number, payload: Uint8Array): string {
  const body = new Uint8Array([prefix, ...payload]);
  const checksum = sha256(sha256(body)).slice(0, 4);
  const full = new Uint8Array([...body, ...checksum]);
  return bs58.encode(full);
}

// ---------- Monero ----------
// XMR does not use BIP32; we deterministically derive its keys from the first
// 32 bytes of the BIP39 seed (sc_reduce32). Import into Monero wallets via
// private key restore, not via seed phrase.

const XMR_L = 2n ** 252n + 27742317777372353535851937790883648493n;
const XMR_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const XMR_ENC_SIZES = [0, 2, 3, 5, 6, 7, 9, 10, 11];

function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

function bigIntToBytesLE(n: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function scReduce32(bytes: Uint8Array): Uint8Array {
  return bigIntToBytesLE(bytesToBigIntLE(bytes) % XMR_L, 32);
}

function xmrBase58(data: Uint8Array): string {
  let out = '';
  for (let i = 0; i < data.length; i += 8) {
    const block = data.slice(i, i + 8);
    let num = 0n;
    for (const b of block) num = (num << 8n) | BigInt(b); // big-endian
    const size = XMR_ENC_SIZES[block.length];
    let str = '';
    for (let j = 0; j < size; j++) {
      str = XMR_ALPHABET[Number(num % 58n)] + str;
      num /= 58n;
    }
    out += str;
  }
  return out;
}

function deriveMonero(seed: Uint8Array): string {
  const privateSpend = scReduce32(seed.slice(0, 32));
  const publicSpend = ed25519.Point.BASE.multiply(bytesToBigIntLE(privateSpend)).toBytes();
  const privateView = scReduce32(keccak_256(privateSpend));
  const publicView = ed25519.Point.BASE.multiply(bytesToBigIntLE(privateView)).toBytes();

  const body = new Uint8Array([0x12, ...publicSpend, ...publicView]); // 0x12 = mainnet standard address
  const checksum = keccak_256(body).slice(0, 4);
  return xmrBase58(new Uint8Array([...body, ...checksum]));
}

// ---------- main ----------

/**
 * Derive first-account addresses on 7 chains from a BIP39 mnemonic:
 * BTC (BIP84), ETH/EVM (m/44'/60'), SOL (SLIP-0010 m/44'/501'), LTC (BIP84),
 * DOGE (m/44'/3'), TRX (m/44'/195'), XMR (deterministic from seed).
 */
export function deriveWallets(mnemonic: string): DerivedWalletSet {
  const normalized = mnemonic.trim().toLowerCase();
  if (!isValidMnemonic(normalized)) throw new Error('Invalid seed phrase');

  const seed = mnemonicToSeedSync(normalized);
  const master = HDKey.fromMasterSeed(seed);

  const derive = (path: string): Uint8Array => {
    const child = master.derive(path);
    const publicKey = child.publicKey;
    if (!publicKey) throw new Error(`Key derivation failed at ${path}`);
    return publicKey;
  };

  // EVM public key (uncompressed, 64 bytes without the 0x04 prefix)
  const evmUncompressed = secp256k1.Point.fromBytes(derive("m/44'/60'/0'/0/0")).toBytes(false).slice(1);
  const evmHash = keccak_256(evmUncompressed).slice(-20);

  // Solana — SLIP-0010 ed25519
  const solChild = Ed25519HDKey.fromMasterSeed(bytesToHex(seed)).derive("m/44'/501'/0'/0'");

  const addresses: DerivedAddress[] = [
    {
      symbol: 'BTC',
      chain: 'Bitcoin',
      address: toBech32Address(derive("m/84'/0'/0'/0/0"), 'bc'),
      path: "m/84'/0'/0'/0/0",
    },
    {
      symbol: 'ETH',
      chain: 'Ethereum',
      address: toChecksumEvmAddress(evmHash),
      path: "m/44'/60'/0'/0/0",
    },
    {
      symbol: 'SOL',
      chain: 'Solana',
      address: bs58.encode(solChild.publicKey),
      path: "m/44'/501'/0'/0'",
    },
    {
      symbol: 'LTC',
      chain: 'Litecoin',
      address: toBech32Address(derive("m/84'/2'/0'/0/0"), 'ltc'),
      path: "m/84'/2'/0'/0/0",
    },
    {
      symbol: 'DOGE',
      chain: 'Dogecoin',
      address: toBase58Check(0x1e, hash160(derive("m/44'/3'/0'/0/0"))),
      path: "m/44'/3'/0'/0/0",
    },
    {
      symbol: 'TRX',
      chain: 'Tron',
      address: toBase58Check(
        0x41,
        keccak_256(
          secp256k1.Point.fromBytes(derive("m/44'/195'/0'/0/0")).toBytes(false).slice(1)
        ).slice(-20)
      ),
      path: "m/44'/195'/0'/0/0",
    },
    {
      symbol: 'XMR',
      chain: 'Monero',
      address: deriveMonero(seed),
      path: 'seed-derived (not BIP32)',
    },
  ];

  return { mnemonic: normalized, addresses };
}
