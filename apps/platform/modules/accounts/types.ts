import type { LanguageCode, ThemePreference } from "@/types";
export interface Publication {
  title: string;
  message: string;
  currency: "BTC" | "ETH" | "SOL" | "DOGE" | "LTC" | "XMR" | "PEARL";
  isStaking: boolean;
  rate: string;
  dailyUsdt: string;
  downloadMbps: string;
  uploadMbps: string;
  watts: string;
  energyTodayWh: string;
}
export interface Device {
  id: string;
  uid: string;
  name: string;
  user_id: string | null;
  revoked_at: string | null;
  version: number | null;
  content: Publication | null;
  published_at: string | null;
  applied_version: number | null;
  last_seen: string | null;
  firmware: string | null;
  online: boolean | null;
}
export interface Withdrawal {
  id: string;
  user_id: string;
  amount: string;
  network: string;
  destination: string;
  status: "requested" | "approved" | "rejected" | "paid";
  reason: string | null;
  tx_hash: string | null;
  created_at: string;
  email?: string;
}
export interface LedgerEntry {
  id: string;
  amount_usdt: string;
  note: string;
  created_at: string;
  kind: "admin_adjustment" | "withdrawal_paid" | "device_daily_reward";
}
export interface Profile {
  id: string;
  uid: string;
  email: string;
  language: LanguageCode;
  theme: ThemePreference;
}
export interface Account {
  asOf: string;
  profile: Profile;
  balance: string;
  reserved: string;
  available: string;
  address: { address: string; network: string } | null;
  devices: Device[];
  withdrawals: Withdrawal[];
  ledger: LedgerEntry[];
}
export interface OperatorOverview {
  contact_inquiries: {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: "new" | "in_progress" | "resolved";
    created_at: string;
    updated_at: string;
  }[];
  login_security: {
    id: string;
    audience: "customer" | "admin";
    attempted_email: string;
    outcome: string;
    ip_address: string | null;
    country: string | null;
    region: string | null;
    user_agent: string | null;
    created_at: string;
  }[];
  applications: {
    id: string;
    email: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
  }[];
  users: {
    id: string;
    email: string;
    uid: string;
    balance: string;
    available: string;
    reserved: string;
  }[];
  devices: Device[];
  withdrawals: Withdrawal[];
  audit: {
    id: string;
    action: string;
    actor_email: string;
    target_id: string;
    created_at: string;
  }[];
  inquiries: {
    id: string;
    name: string;
    email: string;
    quantity: number;
    status: string;
  }[];
}
