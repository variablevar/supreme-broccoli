import test from "node:test";
import assert from "node:assert/strict";
import { database } from "./database";

test("contact inquiries are private and status changes are audited", async () => {
  const db = await database();
  try {
    const { rows: [inquiry] } = await db.query<{ id: string }>(
      `insert into imo.contact_inquiries(name,email,subject,message)
       values('Test Person','person@example.com','Node availability','Please tell me when nodes are available.') returning id`,
    );
    const { rows: [updated] } = await db.query<{ status: string }>(
      "select status from imo.update_contact_inquiry_status($1,'resolved','admin@imnoshi.com')",
      [inquiry.id],
    );
    assert.equal(updated.status, "resolved");
    const { rows: [audit] } = await db.query<{ action: string; target_id: string }>(
      "select action,target_id from imo.admin_audit_log where target_id=$1",
      [inquiry.id],
    );
    assert.equal(audit.action, "contact_inquiry.status_changed");
    assert.equal(audit.target_id, inquiry.id);
    await assert.rejects(
      db.query("select imo.update_contact_inquiry_status($1,'deleted','admin@imnoshi.com')", [inquiry.id]),
      /Invalid contact inquiry status/,
    );
  } finally {
    await db.close();
  }
});
