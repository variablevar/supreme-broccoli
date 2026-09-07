'use client';
import { motion } from 'framer-motion';
import { EngineCard } from './EngineCard';
import { EngineVisualGpu } from './EngineVisualGpu';
import { EngineVisualLlm } from './EngineVisualLlm';
import { EngineVisualTrading } from './EngineVisualTrading';
import { ENGINE_CARDS } from '@/lib/constants';

const ENGINE_VISUALS = [
  { label: 'GPU Workload & Mining', Visual: EngineVisualGpu },
  { label: 'Revenue Accounting', Visual: EngineVisualTrading },
  { label: 'Reward Distribution', Visual: EngineVisualLlm },
];

export function EngineShowcase() {
  return (
    <section id="engines" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-space text-3xl md:text-5xl font-bold text-foreground mb-4">
            Three Engines. One Yield.
          </h2>
          <p className="text-foreground/50 max-w-2xl mx-auto">
            Each engine is optimised for a different layer of the quant pipeline, from GPU workloads to reward distribution.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {ENGINE_CARDS.map((card) => (
            <EngineCard key={card.number} {...card} />
          ))}
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
          {ENGINE_VISUALS.map(({ label, Visual }, index) => (
            <div key={label} className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-foreground/40">Engine 0{index + 1}</div>
              <div className="mt-3 h-28 rounded-xl bg-[#0c1424] border border-border/60 relative overflow-hidden">
                <Visual />
              </div>
              <p className="mt-4 font-space text-lg font-semibold text-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
