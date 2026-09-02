'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GpuClusterCanvas } from './GpuClusterCanvas';
import { MagneticButton } from '@/components/shared/MagneticButton';
import { GradientButton } from '../shared/GradientButton';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <GpuClusterCanvas />

      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
            Next-gen GPU Quant Infrastructure
          </span>
          <h1 className="font-space text-5xl md:text-7xl font-bold text-foreground leading-tight mb-6">
            Rent GPU power.<br />
            <span className="text-primary">
              Multiply rewards.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Imnoshi combines decentralised GPU clusters, a 70B parameter trading LLM, and stake-backed reward multipliers — all in one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <GradientButton className="text-base px-8 py-4">
                Start Building
              </GradientButton>
            </Link>
            <Link href="/login">
              <MagneticButton className="text-base px-8 py-4 rounded-xl border border-border/20 text-foreground hover:bg-accent/5 transition-colors">
                Sign In
              </MagneticButton>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            ['60-70%', 'Mining Power'],
            ['90%', 'Rental Utilisation'],
            ['70B', 'Quant LLM'],
            ['24h', 'Adaptive Trading'],
          ].map(([value, label]) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold font-space text-foreground">{value}</div>
              <div className="text-xs text-foreground/50 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
