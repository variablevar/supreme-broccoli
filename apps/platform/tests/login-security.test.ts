import test from "node:test";
import assert from "node:assert/strict";
import { database } from "./database";

test("registration requires imnoshi.com and login security events are append-only", async () => {
  const db = await database();
  try {
    await assert.rejects(
      db.query(
        "select imo.submit_registration_application('outside@example.com','hash')",
      ),
      /registration_email_domain/,
    );
    await db.query(
      "select imo.submit_registration_application('member@imnoshi.com','hash')",
    );
    await db.query(
      "select imo.record_login_security_event('customer','member@imnoshi.com','approval_required','203.0.113.9','GB','London','test-agent')",
    );
    const {
      rows: [{ overview }],
    } = await db.query<{
      overview: {
        login_security: {
          attempted_email: string;
          outcome: string;
          ip_address: string;
          country: string;
          region: string;
        }[];
      };
    }>("select imo.admin_overview() overview");
    const event = overview.login_security[0];
    assert.equal(event.attempted_email, "member@imnoshi.com");
    assert.equal(event.outcome, "approval_required");
    assert.equal(event.ip_address, "203.0.113.9");
    assert.equal(event.country, "GB");
    assert.equal(event.region, "London");
    const {
      rows: [{ id }],
    } = await db.query<{ id: string }>(
      "select id from imo.login_security_events limit 1",
    );
    await assert.rejects(
      db.query("delete from imo.login_security_events where id=$1", [id]),
      /Append-only/,
    );
  } finally {
    await db.close();
  }
});
