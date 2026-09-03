import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dateTime, getAdminOverview } from '@/lib/adminData';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const { users } = await getAdminOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-space text-3xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customer accounts provisioned from Clerk.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-space">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                  <TableCell>
                    <Badge variant={user.vip_status ? 'default' : 'secondary'}>
                      {user.vip_status ? 'VIP' : 'Standard'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs">
                    {user.wallet_address ?? 'Not connected'}
                  </TableCell>
                  <TableCell>{dateTime(user.created_at)}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users yet.
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
