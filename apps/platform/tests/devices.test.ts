import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { database } from "./database";
import {
  syncInput,
  displayContent,
  pairingInput,
  bulkPublishInput,
} from "../modules/devices/validation";
import { PUBLICATION_PRESETS } from "../modules/devices/publication-presets";
const content = {
  title: "Test display",
  message: "Published by operator",
  currency: "BTC" as const,
  isStaking: false,
  rate: "42",
  dailyUsdt: "1.250000",
  downloadMbps: "87.5",
  uploadMbps: "15.3",
  watts: "42",
  energyTodayWh: "816",
};
test("device protocol rejects financial telemetry and unsupported shapes", () => {
  const heartbeat = {
    protocolVersion: 1,
    firmware: "1.0.0",
    uptimeSeconds: 50,
    wifiRssi: -60,
    appliedVersion: 0,
  };
  assert.ok(syncInput.safeParse(heartbeat).success);
  assert.equal(
    syncInput.safeParse({ ...heartbeat, todayUsdt: 100 }).success,
    false,
  );
  assert.equal(
    syncInput.safeParse({ ...heartbeat, protocolVersion: 2 }).success,
    false,
  );
  assert.equal(
    displayContent.safeParse({ ...content, message: "x".repeat(121) }).success,
    false,
  );
  assert.equal(pairingInput.safeParse({ code: "ABC123" }).success, false);
  assert.equal(pairingInput.parse({ code: " abc234 " }).code, "ABC234");
  assert.equal(PUBLICATION_PRESETS.length, 14);
  for (const preset of PUBLICATION_PRESETS)
    assert.ok(displayContent.safeParse(preset.content).success, preset.id);
  assert.equal(
    bulkPublishInput.safeParse({ content, target: "selected", deviceIds: [] })
      .success,
    false,
  );
});
test("bulk publication targets device presence groups and increments versions", async () => {
  const db = await database();
  try {
    const ids: string[] = [];
    for (const [uid, hash] of [
      ["IMO-ONLINE", "bulk-online"],
      ["IMO-OFFLINE", "bulk-offline"],
    ]) {
      const {
        rows: [{ id }],
      } = await db.query<{ id: string }>(
        "select imo.provision_device($1,$1,$2,'admin@example.com') id",
        [uid, hash],
      );
      ids.push(id);
    }
    await db.query("select imo.sync_device($1,'1.0',10,-50,0)", [ids[0]]);
    const first = await db.query<{ result: { publishedCount: number } }>(
      "select imo.publish_device_group('online',$1,$2,'admin@example.com') result",
      [[], JSON.stringify(content)],
    );
    assert.equal(first.rows[0].result.publishedCount, 1);
    const second = await db.query<{ result: { publishedCount: number } }>(
      "select imo.publish_device_group('all',$1,$2,'admin@example.com') result",
      [[], JSON.stringify({ ...content, activity: "Updated" })],
    );
    assert.equal(second.rows[0].result.publishedCount, 2);
    const publications = await db.query<{ device_id: string; version: number }>(
      "select device_id,version from imo.device_publications order by device_id",
    );
    assert.deepEqual(
      publications.rows.map((row) => row.version).sort(),
      [1, 2],
    );
    const audit = await db.query<{ count: number }>(
      "select count(*)::int count from imo.admin_audit_log where action='device.publish.bulk'",
    );
    assert.equal(audit.rows[0].count, 3);
  } finally {
    await db.close();
  }
});
test("daily rewards require a full day of authenticated online heartbeat time", async () => {
  const db = await database();
  try {
    const user = randomUUID();
    await db.query(
      "insert into imo.users(id,uid,email) values ($1,'IMO-REWARD','reward@example.com')",
      [user],
    );
    const {
      rows: [{ id }],
    } = await db.query<{ id: string }>(
      "select imo.provision_device('IMO-REWARD-DEVICE','Reward device','reward-hash','admin@example.com') id",
    );
    await db.query("update imo.devices set user_id=$1 where id=$2", [user, id]);
    await db.query("select imo.publish_device($1,$2,0,'admin@example.com')", [
      id,
      JSON.stringify(content),
    ]);
    await db.query("select imo.sync_device($1,'1.0',1,-50,0)", [id]);
    await db.query(
      "update imo.device_reward_state set accumulated_online_seconds=86390,last_heartbeat_at=clock_timestamp()-interval '20 seconds' where device_id=$1",
      [id],
    );
    const {
      rows: [{ sync }],
    } = await db.query<{
      sync: {
        account: {
          connectedWalletUsdt: string;
          dailyRevenueUsdt: string;
          reward: { creditedUsdt: string };
        };
      };
    }>("select imo.sync_device($1,'1.0',21,-50,0) sync", [id]);
    assert.equal(sync.account.reward.creditedUsdt, "1.250000");
    assert.equal(sync.account.connectedWalletUsdt, "1.250000");
    assert.equal(sync.account.dailyRevenueUsdt, "1.250000");
    await db.query(
      "update imo.device_reward_state set accumulated_online_seconds=86390,last_heartbeat_at=clock_timestamp()-interval '50 seconds' where device_id=$1",
      [id],
    );
    await db.query("select imo.sync_device($1,'1.0',71,-50,0)", [id]);
    const {
      rows: [{ count }],
    } = await db.query<{ count: number }>(
      "select count(*)::int count from imo.balance_ledger where kind='device_daily_reward'",
    );
    assert.equal(count, 1);
    const {
      rows: [{ audit }],
    } = await db.query<{ audit: number }>(
      "select count(*)::int audit from imo.admin_audit_log where action='device.reward.credited'",
    );
    assert.equal(audit, 1);
  } finally {
    await db.close();
  }
});
test("pairing enforces expiry and single ownership; both views use one publication", async () => {
  const db = await database();
  try {
    const user = randomUUID(),
      other = randomUUID();
    await db.query(
      "insert into imo.users(id,uid,email) values ($1,'IMO-A','a@example.com'),($2,'IMO-B','b@example.com')",
      [user, other],
    );
    const {
      rows: [{ id }],
    } = await db.query<{ id: string }>(
      "select imo.provision_device('IMO-DEVICE','Office device','hashed-secret','admin@example.com') id",
    );
    await db.query("select imo.issue_pairing($1,'ABC234')", [id]);
    await db.query("select imo.claim_device('ABC234',$1)", [user]);
    await db.query("select imo.claim_device('ABC234',$1)", [user]);
    await assert.rejects(
      db.query("select imo.claim_device('ABC234',$1)", [other]),
      /already claimed/,
    );
    await db.query("select imo.publish_device($1,$2,0,'admin@example.com')", [
      id,
      JSON.stringify(content),
    ]);
    await assert.rejects(
      db.query("select imo.publish_device($1,$2,0,'admin@example.com')", [
        id,
        JSON.stringify(content),
      ]),
      /changed/,
    );
    const {
      rows: [{ sync }],
    } = await db.query<{
      sync: {
        paired: boolean;
        publication: { version: number; content: unknown };
      };
    }>("select imo.sync_device($1,'1.0',10,-50,1) sync", [id]);
    assert.equal(sync.paired, true);
    assert.equal(sync.publication.version, 1);
    assert.deepEqual(sync.publication.content, content);
    const {
      rows: [{ account }],
    } = await db.query<{
      account: {
        devices: {
          content: unknown;
          online: boolean;
          applied_version: number;
        }[];
        balance: string;
      };
    }>("select imo.customer_account($1) account", [user]);
    assert.equal(account.devices.length, 1);
    assert.deepEqual(account.devices[0].content, sync.publication.content);
    assert.equal(account.devices[0].online, true);
    assert.equal(account.devices[0].applied_version, 1);
    assert.equal(account.balance, "0.000000");
    const {
      rows: [{ account: isolated }],
    } = await db.query<{ account: { devices: unknown[] } }>(
      "select imo.customer_account($1) account",
      [other],
    );
    assert.equal(isolated.devices.length, 0);
    await db.query("select imo.revoke_device($1,'admin@example.com')", [id]);
    await assert.rejects(
      db.query("select imo.sync_device($1,'1.0',10,-50,1)", [id]),
      /unavailable/,
    );
    const {
      rows: [{ id: expired }],
    } = await db.query<{ id: string }>(
      "select imo.provision_device('IMO-EXPIRED','Expired','another-hash','admin@example.com') id",
    );
    await db.query("select imo.issue_pairing($1,'XYZ789')", [expired]);
    await db.query(
      "update imo.device_pairings set expires_at=now()-interval '1 second' where code='XYZ789'",
    );
    await assert.rejects(
      db.query("select imo.claim_device('XYZ789',$1)", [user]),
      /expired/,
    );
  } finally {
    await db.close();
  }
});
test("concurrent requests cannot overspend or claim the same hardware", async () => {
  const db = await database();
  try {
    const user = randomUUID(),
      other = randomUUID();
    await db.query(
      "insert into imo.users(id,uid,email) values ($1,'IMO-C','c@example.com'),($2,'IMO-D','d@example.com')",
      [user, other],
    );
    await db.query(
      "insert into imo.withdrawal_addresses(user_id,address) values ($1,$2)",
      [user, "0x" + "a".repeat(40)],
    );
    await db.query(
      "select imo.adjust_balance($1,100,'Opening','admin@example.com',$2)",
      [user, randomUUID()],
    );
    const results = await Promise.allSettled([
      db.query("select imo.request_withdrawal($1,80,$2)", [user, randomUUID()]),
      db.query("select imo.request_withdrawal($1,80,$2)", [user, randomUUID()]),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const {
      rows: [{ id }],
    } = await db.query<{ id: string }>(
      "select imo.provision_device('IMO-RACE','Race device','race-hash','admin@example.com') id",
    );
    await db.query("select imo.issue_pairing($1,'RAC234')", [id]);
    const claims = await Promise.allSettled([
      db.query("select imo.claim_device('RAC234',$1)", [user]),
      db.query("select imo.claim_device('RAC234',$1)", [other]),
    ]);
    assert.equal(claims.filter((r) => r.status === "fulfilled").length, 1);
  } finally {
    await db.close();
  }
});
test("password changes invalidate sessions and registration is atomic", async () => {
  const db = await database();
  try {
    const {
      rows: [{ a }],
    } = await db.query<{ a: { id: string; user_id: string } }>(
      "select imo.register_customer('new@example.com','hash','IMO-NEW') a",
    );
    await db.query(
      "update imo.web_users set password_hash='new-hash' where id=$1",
      [a.id],
    );
    const {
      rows: [row],
    } = await db.query<{ session_version: number }>(
      "select session_version from imo.web_users where id=$1",
      [a.id],
    );
    assert.equal(row.session_version, 2);
    await assert.rejects(
      db.query(
        "select imo.register_customer('new@example.com','hash','IMO-OTHER')",
      ),
    );
    const {
      rows: [count],
    } = await db.query<{ n: number }>("select count(*)::int n from imo.users");
    assert.equal(count.n, 1);
    const limits = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.query<{ allowed: boolean }>(
          "select imo.take_rate_limit('test',5,60) allowed",
        ),
      ),
    );
    assert.equal(limits.filter((r) => r.rows[0].allowed).length, 5);
  } finally {
    await db.close();
  }
});
