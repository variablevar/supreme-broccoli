import { Activity, BatteryCharging, Cpu, Database, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createAdminClient } from '@/lib/supabase';
import { dateTime } from '@/lib/adminData';
import { isFullAdmin } from '@/lib/adminAuth';
import { DeviceCommandPanel, DevicePairingPanel } from '@/components/dashboard/DevicePanels';

export const dynamic = 'force-dynamic';

interface DeviceRow {
  id: string;
  uid: string;
  name: string;
  status: 'online' | 'offline' | 'syncing' | 'maintenance';
  gpu_model: string | null;
  model_name: string | null;
  uptime_percent: number | null;
  hash_rate: number | null;
  ai_load: number | null;
  trading_load: number | null;
  today_usdt: number | null;
  total_usdt: number | null;
  last_seen: string | null;
  user_id: string | null;
}

interface RuntimeRow {
  device_id: string;
  current_page: number | null;
  brightness_pct: number | null;
  free_heap: number | null;
  wifi_rssi: number | null;
  uptime_seconds: number | null;
  firmware: string | null;
  last_seen: string | null;
}

async function loadDevicesWithOwners(): Promise<(DeviceRow & { customer: string | null })[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('monitor_devices')
    .select('id, uid, name, status, gpu_model, model_name, uptime_percent, hash_rate, ai_load, trading_load, today_usdt, total_usdt, last_seen, user_id, users(email)')
    .order('last_seen', { ascending: false });
  if (error || !data) return [];
  return (data as Array<DeviceRow & { users: { email: string } | { email: string }[] | null }>).map((row) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    const { users: _ignored, ...rest } = row;
    return { ...rest, customer: u?.email ?? null };
  });
}

async function loadRuntime(): Promise<Record<string, RuntimeRow>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('device_runtime_state')
    .select('device_id, current_page, brightness_pct, free_heap, wifi_rssi, uptime_seconds, firmware, last_seen');
  if (!data) return {};
  const out: Record<string, RuntimeRow> = {};
  for (const r of data as RuntimeRow[]) out[r.device_id] = r;
  return out;
}

export default async function DevicesPage() {
  const [rows, canWrite, runtime] = await Promise.all([
    loadDevicesWithOwners(),
    isFullAdmin(),
    loadRuntime(),
  ]);

  const online = rows.filter((r) => r.status === 'online').length;
  const totalUsdt = rows.reduce((s, r) => s + Number(r.total_usdt ?? 0), 0);
  const todayUsdt = rows.reduce((s, r) => s + Number(r.today_usdt ?? 0), 0);
  const paired = rows.filter((r) => runtime[r.id]?.last_seen).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Monitor Devices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live status for every monitor node. Paired devices post telemetry every
          minute and pull a refreshed display state from the server every 15 s.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Devices</CardTitle></CardHeader>
          <CardContent><p className="font-space text-2xl font-semibold">{rows.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Radio size={14} className="text-success" /> Online</CardTitle></CardHeader>
          <CardContent><p className="font-space text-2xl font-semibold">{online}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Database size={14} /> Paired (last-touch)</CardTitle></CardHeader>
          <CardContent><p className="font-space text-2xl font-semibold">{paired}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BatteryCharging size={14} /> Earnings (today)</CardTitle></CardHeader>
          <CardContent><p className="font-space text-2xl font-semibold">{todayUsdt.toFixed(2)} USDT</p></CardContent>
        </Card>
      </div>

      {canWrite ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DevicePairingPanel />
          <Card>
            <CardHeader><CardTitle className="font-space">Device commands</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Push a configuration update, request an immediate telemetry ping,
                or set per-device display overrides (currency, refresh interval,
                paired-page text). All actions are recorded in the audit log.
              </p>
              <p className="text-xs text-muted-foreground">
                Pick a device on the right and choose an action. Display overrides
                take effect on the device&apos;s next state poll (every 15 s).
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="font-space">Devices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Display state</TableHead>
                <TableHead className="text-right">Today USDT</TableHead>
                <TableHead className="text-right">Total USDT</TableHead>
                <TableHead>Last server-touch</TableHead>
                {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => {
                const r = runtime[d.id];
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.uid}</div>
                    </TableCell>
                    <TableCell className="text-sm">{d.customer ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'online' ? 'default' : d.status === 'offline' ? 'destructive' : 'secondary'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r ? (
                        <>
                          page {r.current_page ?? '?'}
                          {r.brightness_pct != null ? ` · ${r.brightness_pct}%` : ''}
                          {r.wifi_rssi != null ? ` · ${r.wifi_rssi}dBm` : ''}
                          {r.firmware ? <div className="font-mono">{r.firmware}</div> : null}
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(d.today_usdt ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(d.total_usdt ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r?.last_seen ? dateTime(r.last_seen) : dateTime(d.last_seen)}</TableCell>
                    {canWrite ? (
                      <TableCell className="text-right">
                        <DeviceCommandPanel deviceId={d.id} deviceName={d.name} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-muted-foreground">
                    No devices registered yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Lifetime fleet USDT: <span className="font-mono">{totalUsdt.toFixed(2)}</span>
      </p>
    </div>
  );
}
