'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ContactForm() {
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          subject: String(form.get('subject') ?? ''),
          message: String(form.get('message') ?? ''),
          company: String(form.get('company') ?? ''),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send your enquiry.');
      setSubmitted(true);
      toast.success('Your enquiry has been sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your enquiry.');
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="py-10 text-center" role="status">
        <CheckCircle2 className="mx-auto text-success" size={42} />
        <h2 className="mt-5 font-space text-2xl font-semibold">Enquiry received</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Thank you. The IMNOSHI team will review your message and reply to the email address you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" minLength={2} maxLength={120} autoComplete="name" required className="mt-2" />
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" name="email" type="email" maxLength={160} autoComplete="email" required className="mt-2" />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-subject">Subject</Label>
        <Input id="contact-subject" name="subject" minLength={3} maxLength={160} required className="mt-2" />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <textarea id="contact-message" name="message" minLength={10} maxLength={3000} rows={7} required className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Do not include passwords, recovery codes or private wallet keys.</p>
      </div>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <Label htmlFor="contact-company">Company website</Label>
        <Input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={saving} className="w-full gap-2 py-6">
        <Send size={17} />
        {saving ? 'Sending…' : 'Send enquiry'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You can also email <a href="mailto:support@imnoshi.com" className="text-primary hover:underline">support@imnoshi.com</a>.
      </p>
    </form>
  );
}
