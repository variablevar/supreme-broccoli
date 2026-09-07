import { Mail } from 'lucide-react';
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
          <GlassCard hover={false}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail size={20} />
              </span>
              <h3 className="font-space text-xl font-semibold text-foreground">General enquiries</h3>
            </div>
            <p className="text-foreground/60 mb-4 leading-relaxed">
              For monitor node orders, GPU infrastructure questions and partnership enquiries.
            </p>
            <a
              href="mailto:support@imnoshi.com"
              className="block rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              support@imnoshi.com
            </a>
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
