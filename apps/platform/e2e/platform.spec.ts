import { test, expect } from "@playwright/test";
import { generateSync } from "otplib";
import { randomUUID } from "node:crypto";

test("real customer, operator and device acceptance journey", async ({
  page,
  playwright,
}) => {
  const email = `customer-${randomUUID()}@example.test`,
    password = "Customer-test-password!";
  await page.goto("/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Apply for access", exact: true })
    .click();
  await expect(page.getByText("Application received", { exact: true })).toBeVisible();
  expect((await page.request.post("/api/auth/login", { data: { email, password } })).status()).toBe(401);
  const admin = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const login = await admin.post("/api/admin/auth/login", {
    data: {
      email: "operator@example.test",
      password: "Integration-test-password!",
    },
  });
  expect(login.ok()).toBeTruthy();
  const stage = (await login.json()).stage;
  expect(stage).toBe("reset");
  expect((await admin.get("/api/admin/overview")).status()).toBe(401);
  const enrollment = await (await admin.get("/api/admin/auth/setup")).json();
  const code = generateSync({ secret: enrollment.secret });
  expect(
    (
      await admin.post("/api/admin/auth/setup", {
        data: { newPassword: "Operator-new-password!", totpCode: code },
      })
    ).ok(),
  ).toBeTruthy();
  const overview = await (await admin.get("/api/admin/overview")).json();
  const application = overview.applications.find((item: { email: string }) => item.email === email);
  expect(application).toBeTruthy();
  expect((await admin.post(`/api/admin/registrations/${application.id}/decide`, { data: { decision: "approved" } })).ok()).toBeTruthy();
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("No devices paired yet.", { exact: false })).toBeVisible();
  const customer = page.request;
  expect((await customer.get("/api/admin/overview")).status()).toBe(401);
  const account = await (await customer.get("/api/account")).json();
  expect(account.balance).toBe("0.000000");
  const adjustment = await admin.post("/api/admin/balance/adjust", {
    data: {
      userId: account.profile.id,
      amount: "150",
      reason: "Acceptance credit",
      requestKey: randomUUID(),
    },
  });
  expect(adjustment.ok(), await adjustment.text()).toBeTruthy();
  const provision = await admin.post("/api/admin/devices", {
    data: { name: "Office display" },
  });
  expect(provision.status()).toBe(201);
  const device = await provision.json();
  const hardware = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
    extraHTTPHeaders: { Authorization: `Bearer ${device.secret}` },
  });
  const pairing = await (
    await hardware.post("/api/v1/device/pairing-code", { data: {} })
  ).json();
  await page.getByLabel("Pairing code", { exact: true }).fill(pairing.code);
  await page.getByRole("button", { name: "Pair device", exact: true }).click();
  await expect(
    page.getByText("Device paired.", { exact: false }),
  ).toBeVisible();
  const content = {
    title: "Office production",
    message: "Operator publication",
    activity: "Compute",
    rate: "42 jobs",
    dailyUsdt: "1.25",
    totalUsdt: "10",
  };
  expect(
    (
      await admin.put(`/api/admin/devices/${device.id}/state`, {
        data: { content, expectedVersion: 0 },
      })
    ).ok(),
  ).toBeTruthy();
  const sync = await hardware.post("/api/v1/device/sync", {
    data: {
      protocolVersion: 1,
      firmware: "test-1",
      uptimeSeconds: 10,
      wifiRssi: -55,
      appliedVersion: 0,
    },
  });
  expect(sync.ok()).toBeTruthy();
  expect((await sync.json()).publication.content).toEqual(content);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("Office production", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/withdrawals"]').click();
  await page
    .getByLabel("Public Ethereum address", { exact: true })
    .fill("0x" + "a".repeat(40));
  await page.getByRole("button", { name: "Save address", exact: true }).click();
  await expect(page.getByText("Withdrawal address saved.")).toBeVisible();
  await page.getByLabel("Amount (USDT)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: /request withdrawal/i })
    .click();
  await expect(
    page.getByText("Withdrawal requested.", { exact: true }),
  ).toBeVisible();
  const pending = await (await customer.get("/api/account")).json();
  expect(pending.available).toBe("50.000000");
  expect(pending.reserved).toBe("100.000000");
  const w = pending.withdrawals[0];
  expect(
    (
      await admin.post("/api/admin/withdrawals/decide", {
        data: { withdrawalId: w.id, decision: "approved" },
      })
    ).ok(),
  ).toBeTruthy();
  const proof = { withdrawalId: w.id, txHash: "0x" + "b".repeat(64) };
  expect(
    (await admin.post("/api/admin/withdrawals/complete", { data: proof })).ok(),
  ).toBeTruthy();
  expect(
    (await admin.post("/api/admin/withdrawals/complete", { data: proof })).ok(),
  ).toBeTruthy();
  const paid = await (await customer.get("/api/account")).json();
  expect(paid.balance).toBe("50.000000");
  expect(paid.reserved).toBe("0.000000");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Payment recorded by operator.")).toBeVisible();
  await page.locator('a[href="/settings"]').click();
  await page.getByLabel(/language/i).selectOption("de");
  await expect
    .poll(
      async () =>
        (await (await customer.get("/api/account")).json()).profile.language,
    )
    .toBe("de");
  await page.locator("main select").nth(1).selectOption("light");
  await expect
    .poll(
      async () =>
        (await (await customer.get("/api/account")).json()).profile.theme,
    )
    .toBe("light");
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "imo_customer_session")!;
  await customer.post("/api/auth/logout", { data: {} });
  const replay = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3100",
    extraHTTPHeaders: { Cookie: `imo_customer_session=${session.value}` },
  });
  expect((await replay.get("/api/account")).status()).toBe(401);
  await replay.dispose();
  await hardware.dispose();
  await admin.dispose();
});

test("forged cookies, foreign origins and unknown device credentials fail", async ({
  request,
}) => {
  const forged = Buffer.from(
    JSON.stringify({
      email: "operator@example.test",
      stage: "done",
      exp: Date.now() + 3600000,
    }),
  ).toString("base64url");
  expect(
    (
      await request.get("/api/admin/overview", {
        headers: { Cookie: `imo_admin_session=${forged}` },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/v1/device/sync", {
        headers: { Authorization: "Bearer " + "x".repeat(43) },
        data: {},
      })
    ).status(),
  ).toBe(401);
});

test("landing page retains its sections and uses a text wordmark", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("nav").first()).toBeVisible();
  await expect(page.locator("#engines")).toBeVisible();
  await expect(page.locator("#pricing")).toBeVisible();
  await expect(page.locator('img[src*="imnoshi-logo"]')).toHaveCount(0);
});
