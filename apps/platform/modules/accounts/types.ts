import type { LanguageCode, ThemePreference } from "@/types";
export interface Publication {
  title: string;
  message: string;
  activity: string;
  rate: string;
  dailyUsdt: string;
  totalUsdt: string;
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
}
export interface Profile {
  id: string;
  uid: string;
  email: string;
  language: LanguageCode;
  theme: ThemePreference;
}
export interface Account {
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
