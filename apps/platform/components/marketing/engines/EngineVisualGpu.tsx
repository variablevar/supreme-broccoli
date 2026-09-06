export function EngineVisualGpu() {
  return (
    <svg viewBox="0 0 200 112" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gpuCard" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a2540" />
          <stop offset="100%" stopColor="#0c1424" />
        </linearGradient>
        <radialGradient id="gpuGlow" cx="20%" cy="15%" r="65%">
          <stop offset="0%" stopColor="hsl(var(--primary)/0.35)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="200" height="112" fill="url(#gpuGlow)" />

      {/* GPU card body */}
      <rect x="24" y="30" width="152" height="58" rx="8" fill="url(#gpuCard)" stroke="#d8a936" strokeWidth="1.5" opacity="0.9" />
      {/* heatsink fins */}
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={32 + i * 12} y={37} width="4" height="30" rx="1.5" fill="#2a3a5c" opacity="0.8" />
      ))}

      {/* fan hub */}
      <circle cx="150" cy="59" r="19" fill="#0c1424" stroke="#f6d878" strokeWidth="1.5" />
      <g style={{ transformOrigin: '150px 59px', animation: 'gpu-fan-spin 2.4s linear infinite' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d="M150 59 L150 45 Q156 45 156 52 Z"
            fill="hsl(var(--primary)/0.75)"
            transform={`rotate(${i * 60} 150 59)`}
          />
        ))}
      </g>
      <circle cx="150" cy="59" r="4" fill="#f6d878" />

      {/* hashrate meter bars */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={32 + i * 8}
          y={78}
          width="4"
          height="6"
          rx="1"
          fill="hsl(var(--primary))"
          style={{
            transformOrigin: `${34 + i * 8}px 84px`,
            animation: `gpu-meter-bar 1.2s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}

      <circle cx="34" cy="38" r="2.4" fill="#5fd45f">
        <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
