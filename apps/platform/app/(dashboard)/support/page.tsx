'use client';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useI18n } from '@/hooks/useI18n';

export default function DashboardContactPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">{t('contact')}</h1>
        <p className="text-foreground/50">Reach the IMNOSHI team about your device, wallet or account.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail size={20} />
            </span>
            <h3 className="font-space font-semibold text-foreground text-xl">Account support</h3>
          </div>
          <p className="text-foreground/60 mb-4 leading-relaxed">
            For UID-linked device issues, withdrawal status or wallet questions, include your account UID when you
            reach out.
          </p>
          <a
            href="mailto:support@imnoshi.com"
            className="block rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            support@imnoshi.com
          </a>
        </GlassCard>

        <GlassCard>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </span>
            <h3 className="font-space font-semibold text-foreground text-xl">Billing and monitor nodes</h3>
          </div>
          <p className="text-foreground/60 mb-4 leading-relaxed">
            Questions about an existing order, invoice or an additional monitor node.
          </p>
          <a
            href="mailto:support@imnoshi.com"
            className="block rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            support@imnoshi.com
          </a>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle size={20} />
          </span>
          <h3 className="font-space font-semibold text-foreground text-xl">What to include</h3>
        </div>
        <ul className="space-y-2 text-sm text-foreground/60">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            Your account UID
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            A short description of your question or issue
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            The best way and time to reach you
          </li>
        </ul>
        <p className="mt-6 text-xs text-foreground/40">
          Email <a href="mailto:support@imnoshi.com" className="text-primary hover:underline">support@imnoshi.com</a> and our team will follow up.
        </p>
      </GlassCard>
    </div>
  );
}
