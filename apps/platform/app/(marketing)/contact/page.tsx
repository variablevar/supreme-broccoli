import { ArrowUpRight, Mail, MessageSquareText } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { ContactForm } from '@/components/marketing/contact/ContactForm';

export const metadata = {
  title: 'Contact — IMNOSHI',
  description: 'Send the IMNOSHI team a general enquiry about monitor nodes, GPU infrastructure or partnerships.',
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
            Questions about a monitor node, GPU infrastructure or a partnership? Send an enquiry and the IMNOSHI
            team will follow up.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <GlassCard hover={false} className="self-start border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 p-0">
            <div className="h-1 w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <div className="p-6 md:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.12)]">
                <MessageSquareText size={23} />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Talk to our team</p>
              <h2 className="mt-2 font-space text-2xl font-semibold text-foreground">General enquiries</h2>
              <p className="mt-3 text-sm leading-6 text-foreground/60">
                Ask about monitor node orders, GPU infrastructure or partnerships. Use the form or email our team directly.
              </p>
              <a
                href="mailto:support@imnoshi.com"
                className="group mt-7 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-background/60 p-4 transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Mail size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-foreground/45">Email us</span>
                    <span data-no-translate className="block break-all text-sm font-semibold text-foreground">support@imnoshi.com</span>
                  </span>
                </span>
                <ArrowUpRight size={18} className="shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </GlassCard>
          <GlassCard hover={false}>
            <h2 className="mb-2 font-space text-2xl font-semibold text-foreground">Send a general enquiry</h2>
            <p className="mb-6 text-sm text-foreground/60">Complete the form and your message will go directly to the IMNOSHI admin team.</p>
            <ContactForm />
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
