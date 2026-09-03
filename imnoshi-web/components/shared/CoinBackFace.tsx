type CoinBackFaceProps = {
  className?: string;
};

export function CoinBackFace({ className }: CoinBackFaceProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="IMNOSHI robot">
      <defs>
        <linearGradient id="coinBackRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8a6516" />
          <stop offset="28%" stopColor="#fff2b8" />
          <stop offset="52%" stopColor="#9a741e" />
          <stop offset="68%" stopColor="#f6d878" />
          <stop offset="100%" stopColor="#8a6516" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="47" fill="#0a1220" stroke="url(#coinBackRing)" strokeWidth="4" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#d8a936" strokeWidth="1" opacity="0.35" />

      <line x1="50" y1="29" x2="50" y2="19" stroke="#d8a936" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="17" r="3" fill="#5fd4ff" />

      <rect x="31" y="29" width="38" height="26" rx="8" fill="#101d33" stroke="#f6d878" strokeWidth="2" />
      <circle cx="42" cy="42" r="4.2" fill="#5fd4ff" />
      <circle cx="58" cy="42" r="4.2" fill="#5fd4ff" />
      <rect x="40" y="49" width="20" height="2.4" rx="1.2" fill="#d8a936" opacity="0.85" />

      <rect x="22" y="34" width="4" height="10" rx="2" fill="#8a6516" />
      <rect x="74" y="34" width="4" height="10" rx="2" fill="#8a6516" />

      <circle cx="50" cy="78" r="12" fill="#101d33" stroke="url(#coinBackRing)" strokeWidth="2.5" />
      <path
        d="M50 72.5c-2.6 0-4.2 1.3-4.2 3s1.9 2.4 4.2 2.9c2.6.5 4.2 1.3 4.2 3s-1.7 3-4.2 3-4.4-1.1-4.6-2.8"
        fill="none"
        stroke="#f6d878"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line x1="50" y1="70.8" x2="50" y2="85.2" stroke="#f6d878" strokeWidth="1.4" strokeLinecap="round" />

      <path
        d="M18 62c6-4 12-4 16 0M66 62c6-4 12-4 16 0"
        fill="none"
        stroke="#d8a936"
        strokeWidth="1.2"
        opacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
