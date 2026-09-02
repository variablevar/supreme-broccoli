'use client';

// Pure CSS entrance animation — no JS dependency, so the page can never get
// stuck invisible if hydration is slow or a chunk fails to load.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
