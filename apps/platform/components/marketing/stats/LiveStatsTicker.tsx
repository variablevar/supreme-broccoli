'use client';
import { CountUpNumber } from '@/components/shared/CountUpNumber';

export function LiveStatsTicker() {
  return (
    <section id="stats" className="relative py-12 border-y border-border/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="font-space text-4xl font-bold text-foreground md:text-5xl">
            <CountUpNumber end={1000} suffix="+ GPUs" duration={2} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">
              Total rig capacity
            </p>
            <p className="mt-2 max-w-3xl text-xs uppercase leading-6 tracking-wider text-foreground/40 md:text-sm">
              RTX 5090 · RTX 5080 · RTX 4090 · RTX 4080 Super · RTX 4080 · RTX 3090 · Mixed infrastructure
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
