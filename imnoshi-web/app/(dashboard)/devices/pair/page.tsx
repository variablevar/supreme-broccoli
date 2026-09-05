'use client';

import { useMemo, useState } from 'react';
import { QrCode, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Customer-side pairing flow:
 *   1) Admin generates a 6-char code, hands it to the customer.
 *   2) Customer enters it here -> server reserves the device.
 *   3) Page shows a QR (the claim token) and a WiFi setup helper.
 *      The device scans the QR (or pulls the token over USB serial)
 *      and finishes binding.
 *   4) Device starts posting telemetry after its first poll.
 */
export default function DevicePairPage() {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claim, setClaim] = useState<{ deviceId: string; claimToken: string } | null>(null);

  const qrText = useMemo(() => {
    if (!claim) return '';
    return JSON.stringify({ v: 1, t: claim.claimToken, d: claim.deviceId });
  }, [claim]);

  const submit = async () => {
    if (code.length !== 6) {
      toast.error('Code is 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Pairing failed');
      }
      const data = await res.json();
      setClaim(data);
      toast.success('Device reserved. Show the QR below to your device.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-space text-3xl font-bold text-foreground mb-2">Pair a monitor device</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code given to you by the IMNOSHI team, then show the
          device the QR code that appears.
        </p>
      </div>

      {!claim ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-space">Step 1 — Enter your code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-2xl tracking-widest text-center"
            />
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? 'Validating…' : 'Validate code'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-space">Step 2 — Show this to your device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the IMNOSHI mobile app or any QR scanner to scan this code.
                The device will pair with your account over WiFi.
              </p>
              <div className="rounded-xl bg-background border border-border p-4 flex flex-col items-center gap-3">
                <QrCode size={28} className="text-primary" />
                <p className="text-xs text-muted-foreground">
                  Encoded token (payload-only, no personal data):
                </p>
                <code className="font-mono text-xs break-all max-w-full text-center">
                  {qrText}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Token format: <code className="font-mono">base64url(24 random bytes)</code>.
                Identifies your device only -- never contains credentials.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-space">Step 3 — Power on & connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Wifi size={16} className="mt-0.5 text-primary" />
                Power on the device. Once it sees the QR (or you paste the
                token over USB serial) it joins WiFi and posts telemetry every
                minute.
              </p>
              <p className="flex items-start gap-2">
                <Smartphone size={16} className="mt-0.5 text-primary" />
                If the device cannot reach the internet, it shows the offline
                icon and stops tallying earnings. As soon as it reconnects
                the dashboard picks up.
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-primary" />
                If you suspect the device is stolen or compromised, ask the
                admin to revoke the pairing from the Devices page.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
