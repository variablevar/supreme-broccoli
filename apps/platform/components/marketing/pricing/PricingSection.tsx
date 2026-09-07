'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, LineChart, Monitor, ShieldCheck, Wallet } from 'lucide-react';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { GradientButton } from '../shared/GradientButton';

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-gradient-to-b from-background to-secondary/25">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-space text-3xl md:text-5xl font-bold text-foreground mb-4">
            Get One Monitor Node
          </h2>
          <p className="text-foreground/50 max-w-2xl mx-auto">
            One device connects your account UID to a dedicated GPU lane operated by <LiveBrand className="text-base align-baseline" />. You monitor output, uptime, model status and USDT earnings from your dashboard.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mt-3 max-w-xl text-foreground/60">
                  Hardware at your side, infrastructure on ours. The monitor node is paired with your UID and reports the activity of the GPU, model and exchange lane dedicated to your account.
                </p>
              </div>
              <Link href="/purchase">
                <GradientButton className="px-7 py-4">Buy One</GradientButton>
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [Monitor, 'UID-linked device dashboard'],
                [Cpu, 'Dedicated GPU infrastructure lane'],
                [LineChart, 'Daily USDT earnings visibility'],
                [Wallet, 'Crypto and Bank payout setup'],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-4">
                  <Icon size={18} className="text-primary" />
                  <span className="text-sm text-foreground/75">{label as string}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-8"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-space text-2xl font-semibold text-foreground">What You See</h3>
            </div>
            <div className="mt-6 space-y-4">
              {[
                'How many monitor nodes are connected',
                'GPU mining currency, device uptime and estimated daily revenue',
                'Today earnings, total earnings and available USDT',
                'Withdrawal status, wallet addresses, time and date records',
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm text-foreground/70">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
