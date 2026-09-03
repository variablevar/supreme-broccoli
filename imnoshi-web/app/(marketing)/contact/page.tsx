import { Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';

export const metadata = {
  title: 'Contact — IMNOSHI',
  description: 'Get in touch with the IMNOSHI team about monitor nodes, GPU infrastructure and account support.',
};

export default function ContactPage() {
  return (
    <section className="relative min-h-screen pt-32 pb-24 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
            Contact
          </span>
          <h1 className="font-space text-4xl md:text-5xl font-bold text-foreground mb-4">Get in touch</h1>
          <p className="text-foreground/60 max-w-xl mx-auto leading-relaxed">
            Questions about a monitor node, GPU infrastructure or your account? Reach out and the IMNOSHI team will
            follow up.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail size={20} />
              </span>
              <h3 className="font-space text-xl font-semibold text-foreground">General enquiries</h3>
            </div>
            <p className="text-foreground/60 mb-4 leading-relaxed">
              For monitor node orders, GPU infrastructure questions and partnership enquiries.
            </p>
            <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground/50">
              Contact email coming soon
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck size={20} />
              </span>
              <h3 className="font-space text-xl font-semibold text-foreground">Account support</h3>
            </div>
            <p className="text-foreground/60 mb-4 leading-relaxed">
              Already have a device? Sign in for UID-linked support, or reach the account team directly.
            </p>
            <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground/50">
              Contact email coming soon
            </div>
          </GlassCard>
        </div>

        <GlassCard className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle size={20} />
            </span>
            <h3 className="font-space text-xl font-semibold text-foreground">What to include</h3>
          </div>
          <ul className="space-y-2 text-sm text-foreground/60">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Your account UID, if you already have a monitor node
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
            A dedicated contact address is being finalised and will appear on this page shortly.
          </p>
        </GlassCard>
      </div>
    </section>
  );
}
