const OUTER_NODES = [
  { x: 40, y: 24 },
  { x: 100, y: 16 },
  { x: 160, y: 24 },
  { x: 172, y: 60 },
  { x: 160, y: 96 },
  { x: 100, y: 104 },
  { x: 40, y: 96 },
  { x: 28, y: 60 },
];

export function EngineVisualLlm() {
  return (
    <svg viewBox="0 0 200 112" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="llmGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="hsl(var(--primary)/0.3)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="200" height="112" fill="url(#llmGlow)" />

      {OUTER_NODES.map((node, i) => (
        <line
          key={i}
          x1="100"
          y1="60"
          x2={node.x}
          y2={node.y}
          stroke="#d8a936"
          strokeWidth="1"
          opacity="0.35"
        />
      ))}

      {OUTER_NODES.map((node, i) => (
        <circle
          key={`pulse-${i}`}
          r="2.4"
          fill="hsl(var(--primary))"
          style={{ filter: 'drop-shadow(0 0 3px hsl(var(--primary)))' }}
        >
          <animateMotion
            dur={`${2.2 + (i % 3) * 0.4}s`}
            repeatCount="indefinite"
            path={`M100,60 L${node.x},${node.y}`}
            begin={`${i * 0.18}s`}
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.15;0.85;1"
            dur={`${2.2 + (i % 3) * 0.4}s`}
            repeatCount="indefinite"
            begin={`${i * 0.18}s`}
          />
        </circle>
      ))}

      {OUTER_NODES.map((node, i) => (
        <circle key={`node-${i}`} cx={node.x} cy={node.y} r="3.4" fill="#101d33" stroke="#f6d878" strokeWidth="1.2" />
      ))}

      {/* central compute core */}
      <circle cx="100" cy="60" r="15" fill="#0c1424" stroke="#f6d878" strokeWidth="1.6" />
      <circle cx="100" cy="60" r="9" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.8">
        <animate attributeName="r" values="7;10;7" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="60" r="3" fill="hsl(var(--primary))" />
    </svg>
  );
}
