'use client';
import { motion } from 'framer-motion';
import { BuildOptionCard } from './BuildOptionCard';
import { BUILD_OPTIONS } from '@/lib/constants';

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-gradient-to-b from-background to-background/95">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-space text-3xl md:text-5xl font-bold text-foreground mb-4">
            Build Options
          </h2>
          <p className="text-foreground/50 max-w-2xl mx-auto">
            Choose how you want to participate in the engine — full ownership, balanced entry, or zero-hardware rental.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {BUILD_OPTIONS.map((option) => (
            <BuildOptionCard key={option.name} {...option} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-12 glass rounded-2xl p-6 text-center text-foreground/50 text-sm"
        >
          Electricity: full load 650–700 kWh (~£500–600/mo at £0.25/kWh). Full power deployments may reach ~£1,500/mo.
          VIP members receive 2 withdrawals per month as staked.
        </motion.div>
      </div>
    </section>
  );
}
