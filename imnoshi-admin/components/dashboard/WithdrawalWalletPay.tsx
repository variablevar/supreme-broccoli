'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, AlertTriangle } from 'lucide-react';

interface Props {
  withdrawalId: string;
  /** USDT amount in the withdrawal (display only). */
  amount: number;
  /** The on-chain address the customer wants to receive the payout at. */
  destinationAddress: string | null;
  /** Display label like 'TRC20' / 'ERC20' / 'BANK'. */
  destinationLabel: string | null;
  /** Recipient network. */
  destinationNetwork: 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | null;
  /** Method -- 'bank' destinations can't be paid via Web3. */
  method: 'crypto' | 'bank';
  /** Withdrawal status -- only show Pay button for pending / processing. */
  status: 'pending' | 'processing' | 'completed' | 'rejected';
}

interface InjectedEthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: InjectedEthereumProvider;
  }
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  56: 'BNB Smart Chain',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum One',
  43114: 'Avalanche C-Chain',
};

const SUPPORTED_DEST_NETWORKS = new Set(['ERC20', 'BEP20']);
const SUPPORTED_DEST_NETWORKS = new Set(['ERC20', 'BEP20']);

/**
 * "Pay from Web3 wallet" button for a single withdrawal row.
 *
 * IMPORTANT: This is a *demonstration* helper. Real production payouts
 * for IMNOSHI must use the right token contract per chain (USDT on
 * TRC20 / ERC20 / BEP20 / SPL on Solana), with correct decimals and
 * the operator's hot-wallet balance. Sending native ETH/BNB here is a
 * stand-in so you can see the click-to-pay plumbing end-to-end.
 */
export function WithdrawalWalletPay({
  withdrawalId,
  amount,
  destinationAddress,
  destinationLabel: _destinationLabel,
  destinationNetwork,
  method,
  status,
}: Props) {
  const router = useRouter();
  const [hasProvider, setHasProvider] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasProvider(!!window.ethereum);
    if (!window.ethereum) return;

    window.ethereum.request({ method: 'eth_accounts' })
      .then((accs) => {
        if (Array.isArray(accs) && accs.length > 0) setAccount((accs[0] as string));
      })
      .catch(() => {});
    window.ethereum.request({ method: 'eth_chainId' })
      .then((id) => {
        if (typeof id === 'string') setChainId(parseInt(id, 16));
      })
      .catch(() => {});

    const onAccountsChanged = (accs: unknown) => {
      const list = Array.isArray(accs) ? (accs as string[]) : [];
      setAccount(list[0] ?? null);
    };
    const onChainChanged = (id: unknown) => {
      if (typeof id === 'string') setChainId(parseInt(id, 16));
    };
    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    window.ethereum.on?.('chainChanged', onChainChanged);
    return () => {
      window.ethereum?.removeListener?.('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', onChainChanged);
    };
  }, []);

  if (method !== 'crypto') return null;
  if (status === 'completed' || status === 'rejected') return null;
  if (!destinationAddress) return null;

  const chainSupported = destinationNetwork ? SUPPORTED_DEST_NETWORKS.has(destinationNetwork) : false;

  async function connect() {
    if (!window.ethereum) return;
    try {
      const accs = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      setAccount(accs[0] ?? null);
    } catch {}
  }

  async function pay() {
    if (!window.ethereum || !account || !destinationAddress) return;
    setBusy(true);
    try {
      const { BrowserProvider, parseEther } = await import('ethers');
      const provider = new BrowserProvider(window.ethereum as never);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: destinationAddress,
        value: parseEther('0.0001'),
      });
      const receipt = await tx.wait();
      await fetch('/api/withdrawals/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          network: 'ERC20',
          destination: destinationAddress,
          amountUsdt: amount,
          externalTxHash: receipt.hash,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!hasProvider) return null;
  if (!account) {
    return (
      <Button size="sm" variant="outline" onClick={connect}>
        <Wallet size={14} className="mr-1" />
        Connect wallet
      </Button>
    );
  }

  if (!chainSupported) return null;

  const chainName = chainId != null ? CHAIN_NAMES[chainId] ?? `chain ${chainId}` : 'wallet';
  return (
    <Button size="sm" onClick={pay} disabled={busy}>
      <Wallet size={14} className="mr-1" />
      {busy ? 'Sending…' : `Pay from ${chainName}`}
    </Button>
  );
}