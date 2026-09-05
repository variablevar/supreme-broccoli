import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime } from '@/lib/adminData';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: number;
  actor_email: string;
  actor_role: 'full' | 'view';
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: unknown;
  ip: string | null;
  created_at: string;
}

export default async function AuditPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_audit_log')
    .select('id, actor_email, actor_role, action, target_table, target_id, details, ip, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows: AuditRow[] = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every admin action is recorded. Most recent 200 entries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-space">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dateTime(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.actor_email}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs uppercase">{r.actor_role}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.target_table ? `${r.target_table}:${r.target_id ?? '—'}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.ip ?? '—'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No admin actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
