export const APP_NAME = 'Imnoshi';

export const NAV_LINKS = [
  { label: 'Engines', href: '#engines' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Stats', href: '#stats' },
  { label: 'Dashboard', href: '/dashboard' },
];

export const DASHBOARD_NAV = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Wallet', href: '/wallet', icon: 'Wallet' },
  { label: 'Staking', href: '/staking', icon: 'Coins' },
  { label: 'Rewards', href: '/rewards', icon: 'Gift' },
  { label: 'Withdrawals', href: '/withdrawals', icon: 'ArrowDownLeft' },
  { label: 'Transactions', href: '/transactions', icon: 'Receipt' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

export const ENGINE_CARDS = [
  {
    number: 1,
    title: 'GPU Mining Engine',
    description:
      'Dedicated GPU cluster for crypto mining. 60–70% of power directed to mining with 90% utilization during rental windows.',
    features: [
      '2–3 hour daily mining cycles',
      '90% rental utilization ($8–10/day)',
      '24-hour reward polls',
    ],
  },
  {
    number: 2,
    title: '70B Quant LLM',
    description:
      'Adaptive trading engine operating as an exchanger in the same coin as mined. Stake vault balance acts as a reward multiplier.',
    features: [
      '24h adaptive market trading',
      'Stake vault reward multiplier',
      'Same-coin exchange arbitrage',
    ],
  },
  {
    number: 3,
    title: 'Quant Server',
    description:
      'Profit-sharing server handling withdrawals, trading, exchanging, and holding across main wallet and user wallets.',
    features: [
      'Profit sharing distribution',
      'VIP withdrawal scheduling',
      'Multi-wallet settlement',
    ],
  },
];

export const BUILD_OPTIONS = [
  {
    name: 'Full Build',
    price: '£2,200–2,600',
    description: 'Complete GPU rig + stake allocation. Maximum reward potential.',
    features: ['GPU rig ownership', 'Full stake multiplier', 'Electricity: ~£500-600/mo', 'Highest reward share'],
  },
  {
    name: 'Half Build',
    price: '£1,200 + £800 stake',
    description: 'Balanced entry with dedicated hardware and locked stake.',
    features: ['Entry-level GPU rig', '£800 locked stake', 'Lower electricity draw', 'Mid-tier rewards'],
  },
  {
    name: 'Rental',
    price: '£60/month + £2,000 stake',
    description: 'No hardware or electricity costs. 20% more reward with stake backing.',
    features: ['No hardware upkeep', 'No electricity bill', '£2,000 stake required', '+20% reward boost'],
  },
];

export const LOCK_PERIODS = [1, 3, 6, 12] as const;

export function calculateAPY(months: number) {
  const base = 8;
  return base + months * 1.5;
}

export function calculateMultiplier(months: number) {
  return 1 + months * 0.05;
}

export function calculateEndDate(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}
