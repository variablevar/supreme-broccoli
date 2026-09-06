const CANDLES = [
  { x: 20, top: 70, bottom: 82, open: 76, close: 72, up: true },
  { x: 38, top: 62, bottom: 80, open: 78, close: 66, up: true },
  { x: 56, top: 58, bottom: 74, open: 60, close: 71, up: false },
  { x: 74, top: 48, bottom: 68, open: 66, close: 52, up: true },
  { x: 92, top: 44, bottom: 60, open: 46, close: 58, up: false },
  { x: 110, top: 32, bottom: 52, open: 50, close: 36, up: true },
  { x: 128, top: 28, bottom: 44, open: 30, close: 41, up: false },
  { x: 146, top: 18, bottom: 36, open: 34, close: 21, up: true },
  { x: 164, top: 14, bottom: 30, open: 16, close: 27, up: false },
  { x: 182, top: 6, bottom: 22, open: 20, close: 9, up: true },
];

export function EngineVisualTrading() {
  const linePoints = CANDLES.map((c) => `${c.x},${c.up ? c.close : c.open}`).join(' ');

  return (
    <svg viewBox="0 0 200 112" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="tradingGlow" cx="80%" cy="10%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--primary)/0.3)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="tradingFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary)/0.25)" />
          <stop offset="100%" stopColor="hsl(var(--primary)/0)" />
        </linearGradient>
      </defs>

      <rect width="200" height="112" fill="url(#tradingGlow)" />

      {[24, 48, 72, 96].map((y) => (
        <line key={y} x1="8" y1={y} x2="192" y2={y} stroke="#f6d878" strokeWidth="0.5" opacity="0.12" />
      ))}

      {CANDLES.map((c, i) => (
        <g key={i} style={{ animation: `trading-candle-in 0.5s ease-out both`, animationDelay: `${i * 0.08}s` }}>
          <line x1={c.x} y1={c.top} x2={c.x} y2={c.bottom} stroke={c.up ? '#5fd45f' : '#e2617a'} strokeWidth="1.4" />
          <rect
            x={c.x - 3.5}
            y={Math.min(c.open, c.close)}
            width="7"
            height={Math.max(Math.abs(c.close - c.open), 2)}
            fill={c.up ? '#5fd45f' : '#e2617a'}
            opacity="0.9"
          />
        </g>
      ))}

      <polyline points={`20,90 ${linePoints} 182,90`} fill="url(#tradingFade)" opacity="0.5" stroke="none" />
      <polyline points={linePoints} fill="none" stroke="#f6d878" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />

      <circle r="3" fill="#f6d878" style={{ filter: 'drop-shadow(0 0 4px #f6d878)' }}>
        <animateMotion dur="3.6s" repeatCount="indefinite" path={`M${linePoints}`} rotate="auto" />
      </circle>
    </svg>
  );
}
