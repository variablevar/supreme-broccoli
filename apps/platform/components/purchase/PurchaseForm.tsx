'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Cpu, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { GlassCard } from '@/components/shared/GlassCard';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { toast } from 'sonner';

export function PurchaseForm() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      quantity: Number(form.get('quantity') ?? 1),
      company: String(form.get('company') ?? ''),
    };

    try {
      const res = await fetch('/api/purchase-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not submit purchase request');
      setSubmitted(true);
      toast.success('Purchase request received');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase request failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} />
          Back to IMNOSHI
        </Link>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-primary">Monitor node order</p>
              <BrandLogo size={132} showWordmark={false} priority className="mb-4 mt-4" />
              <h1 className="mt-3 font-space text-4xl font-bold text-foreground md:text-6xl">
                Get one <LiveBrand className="text-4xl md:text-6xl align-baseline" /> device.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                £3,000 per monitor node. The GPU infrastructure stays operated by IMNOSHI, while your device UID shows the mining, LLM and exchange lane dedicated to you.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <GlassCard hover={false}>
                <Monitor className="text-primary" size={22} />
                <p className="mt-4 font-space text-xl font-semibold">Your node</p>
                <p className="mt-2 text-sm text-muted-foreground">UID, status, uptime and device telemetry in one dashboard.</p>
              </GlassCard>
              <GlassCard hover={false}>
                <Cpu className="text-primary" size={22} />
                <p className="mt-4 font-space text-xl font-semibold">Our GPU lane</p>
                <p className="mt-2 text-sm text-muted-foreground">Mining, AI workload and trading settlement connected to your account.</p>
              </GlassCard>
            </div>
          </div>

          <GlassCard hover={false} className="self-start">
            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={42} className="mx-auto text-success" />
                <h2 className="mt-5 font-space text-2xl font-semibold">Request received</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your order request is saved. We will use these details to arrange the monitor node purchase and account pairing.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h2 className="font-space text-2xl font-semibold">Reserve a monitor node</h2>
                </div>

                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" minLength={2} maxLength={120} autoComplete="name" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" maxLength={160} autoComplete="email" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" maxLength={80} autoComplete="tel" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} required className="mt-2" />
                </div>

                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <Label htmlFor="purchase-company">Company website</Label>
                  <Input id="purchase-company" name="company" tabIndex={-1} autoComplete="off" />
                </div>

                <Button type="submit" disabled={saving} className="w-full py-6">
                  {saving ? 'Submitting...' : 'Submit Purchase Request'}
                </Button>
              </form>
            )}
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
