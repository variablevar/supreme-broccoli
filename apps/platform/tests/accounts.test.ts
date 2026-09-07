import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  amount,
  address,
  withdrawalInput,
  paymentInput,
} from "../modules/accounts/validation";

import { database } from "./database";
test("amounts, destinations and payout payloads reject unsafe input", () => {
  for (const input of [
    "0",
    "-1",
    "1e3",
    "NaN",
    "1.1234567",
    "9999999999999",
    "01",
    "0.000000",
  ])
    assert.equal(amount.safeParse(input).success, false, input);
  assert.equal(amount.parse("0.000001"), "0.000001");
  assert.equal(address.safeParse("0x" + "0".repeat(40)).success, false);
  assert.equal(
    withdrawalInput.safeParse({ amount: 100, requestKey: randomUUID() })
      .success,
    false,
  );
  assert.equal(
    paymentInput.safeParse({
      withdrawalId: randomUUID(),
      txHash: "0x" + "a".repeat(64),
      amount: "100",
    }).success,
    false,
  );
});
test("actual Postgres functions reserve, release and debit exactly once", async () => {
  const db = await database();
  try {
    const user = randomUUID();
    const dest = "0x" + "a".repeat(40);
    await db.query("insert into imo.users(id,uid,email) values ($1,$2,$3)", [
      user,
      "IMO-TEST",
      "test@example.com",
    ]);
    await db.query(
      "insert into imo.withdrawal_addresses(user_id,address) values ($1,$2)",
      [user, dest],
    );
    const adjustKey = randomUUID();
    const credit = () =>
      db.query(
        "select imo.adjust_balance($1,150,'Opening credit','admin@example.com',$2)",
        [user, adjustKey],
      );
    await credit();
    await credit();
    const key = randomUUID();
    const request = () =>
      db.query<{ w: { id: string } }>(
        "select imo.request_withdrawal($1,100,$2) w",
        [user, key],
      );
    const {
      rows: [{ w }],
    } = await request();
    await request();
    let balance = await db.query<{
      balance: string;
      reserved: string;
      available: string;
    }>("select * from imo.account_balances where user_id=$1", [user]);
    assert.equal(balance.rows[0].balance, "150.000000");
    assert.equal(balance.rows[0].reserved, "100.000000");
    assert.equal(balance.rows[0].available, "50.000000");
    await assert.rejects(
      db.query("select imo.request_withdrawal($1,60,$2)", [user, randomUUID()]),
      /Insufficient/,
    );
    await assert.rejects(
      db.query(
        "select imo.adjust_balance($1,-60,'Invalid debit','admin@example.com',$2)",
        [user, randomUUID()],
      ),
      /reserved/,
    );
    await assert.rejects(
      db.query("select imo.record_payment($1,$2,'admin@example.com')", [
        w.id,
        "0x" + "b".repeat(64),
      ]),
      /Approve/,
    );
    await db.query(
      "select imo.decide_withdrawal($1,'rejected','Customer asked','admin@example.com')",
      [w.id],
    );
    await db.query(
      "select imo.decide_withdrawal($1,'rejected','Customer asked','admin@example.com')",
      [w.id],
    );
    balance = await db.query(
      "select * from imo.account_balances where user_id=$1",
      [user],
    );
    assert.equal(balance.rows[0].balance, "150.000000");
    assert.equal(balance.rows[0].reserved, "0.000000");
    const {
      rows: [{ w: paid }],
    } = await db.query<{ w: { id: string } }>(
      "select imo.request_withdrawal($1,100,$2) w",
      [user, randomUUID()],
    );
    await db.query(
      "update imo.withdrawal_addresses set address=$1 where user_id=$2",
      ["0x" + "c".repeat(40), user],
    );
    await db.query(
      "select imo.decide_withdrawal($1,'approved',null,'admin@example.com')",
      [paid.id],
    );
    const pay = () =>
      db.query("select imo.record_payment($1,$2,'admin@example.com')", [
        paid.id,
        "0x" + "d".repeat(64),
      ]);
    await pay();
    await pay();
    const {
      rows: [saved],
    } = await db.query<{ destination: string; status: string }>(
      "select * from imo.withdrawals where id=$1",
      [paid.id],
    );
    assert.equal(saved.destination, dest);
    assert.equal(saved.status, "paid");
    balance = await db.query(
      "select * from imo.account_balances where user_id=$1",
      [user],
    );
    assert.equal(balance.rows[0].balance, "50.000000");
    assert.equal(balance.rows[0].reserved, "0.000000");
    await assert.rejects(
      db.query(
        "select imo.decide_withdrawal($1,'approved',null,'admin@example.com')",
        [paid.id],
      ),
      /closed/,
    );
    await assert.rejects(
      db.query("update imo.balance_ledger set amount_usdt=999"),
      /Append-only/,
    );
  } finally {
    await db.close();
  }
});
test("database rejects fractional overflow and conflicting idempotency keys", async () => {
  const db = await database();
  try {
    const user = randomUUID(),
      key = randomUUID();
    await db.query(
      "insert into imo.users(id,uid,email) values ($1,'IMO-TWO','two@example.com')",
      [user],
    );
    await assert.rejects(
      db.query(
        "select imo.adjust_balance($1,0.0000001,'Bad precision','admin@example.com',$2)",
        [user, key],
      ),
      /Invalid USDT/,
    );
    await db.query(
      "select imo.adjust_balance($1,1,'Credit','admin@example.com',$2)",
      [user, key],
    );
    await assert.rejects(
      db.query(
        "select imo.adjust_balance($1,2,'Credit','admin@example.com',$2)",
        [user, key],
      ),
      /reused/,
    );
  } finally {
    await db.close();
  }
});
