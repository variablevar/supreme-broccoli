'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers without async clipboard (e.g. over
        // http on a non-secure context).
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success(label ? `Copied ${label}` : 'Copied');
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Copy failed');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
      title={text}
      aria-label="Copy address"
    >
      {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
    </button>
  );
}