'use client';
import { motion } from 'framer-motion';
import { EngineCard } from './EngineCard';
import { ENGINE_CARDS } from '@/lib/constants';

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
            Each engine is optimised for a different layer of the quant pipeline — from GPU mining to LLM-driven trading.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {ENGINE_CARDS.map((card) => (
            <EngineCard key={card.number} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
