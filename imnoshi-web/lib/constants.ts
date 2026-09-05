export const APP_NAME = 'IMNOSHI';

export const NAV_LINKS = [
  { label: 'Engines', href: '#engines' },
  { label: 'Monitor Node', href: '#pricing' },
  { label: 'Stats', href: '#stats' },
  { label: 'Dashboard', href: '/dashboard' },
];

export const DASHBOARD_NAV = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Devices', href: '/devices', icon: 'Cpu' },
  { label: 'Pair Device', href: '/devices/pair', icon: 'Link' },
  { label: 'Wallets', href: '/wallet', icon: 'Wallet' },
  { label: 'Earnings', href: '/rewards', icon: 'Gift' },
  { label: 'Withdrawals', href: '/withdrawals', icon: 'ArrowDownLeft' },
  { label: 'Transactions', href: '/transactions', icon: 'Receipt' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Contact', href: '/support', icon: 'Mail' },
];

export const ENGINE_CARDS = [
  {
    number: 1,
    title: 'Mining Engine',
    description:
      'Dedicated GPU power runs verified mining windows and reports performance into the customer monitor node.',
    features: [
      'GPU availability checks',
      'Daily USDT earning entries',
      'UID-linked device telemetry',
    ],
  },
  {
    number: 2,
    title: 'LLM Work Engine',
    description:
      'A dedicated model lane handles useful LLM workloads and converts its output into account-level USDT earnings.',
    features: [
      'Model status visibility',
      'Workload and uptime reporting',
      'Per-device revenue accounting',
    ],
  },
  {
    number: 3,
    title: 'Exchange Engine',
    description:
      'The exchange layer trades and settles revenue into USDT while keeping withdrawal records transparent.',
    features: [
      'Trading activity summaries',
      'USDT settlement ledger',
      '7-day withdrawal cycle',
    ],
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
