import test from "node:test";
import assert from "node:assert/strict";
import { database } from "./database";

test("purchase inquiry workflow constrains input and audits status changes", async () => {
  const db = await database();
  try {
    const { rows: [inquiry] } = await db.query<{ id: string }>(
      `insert into imo.purchase_inquiries(name,email,phone,quantity)
       values('Buyer Name','buyer@example.com','+44 20 0000 0000',2) returning id`,
    );
    const { rows: [updated] } = await db.query<{ status: string }>(
      "select status from imo.update_purchase_inquiry_status($1,'contacted','admin@imnoshi.com')",
      [inquiry.id],
    );
    assert.equal(updated.status, "contacted");
    const { rows: [audit] } = await db.query<{ action: string; target_id: string }>(
      "select action,target_id from imo.admin_audit_log where target_id=$1",
      [inquiry.id],
    );
    assert.equal(audit.action, "purchase_inquiry.status_changed");
    assert.equal(audit.target_id, inquiry.id);
    await assert.rejects(
      db.query("select imo.update_purchase_inquiry_status($1,'deleted','admin@imnoshi.com')", [inquiry.id]),
      /Invalid purchase inquiry status/,
    );
    await assert.rejects(
      db.query("insert into imo.purchase_inquiries(name,email,phone,quantity) values('X','UPPER@EXAMPLE.COM','',21)"),
    );
  } finally {
    await db.close();
  }
});
