import type { Publication } from "@/modules/accounts/types";

export interface PublicationPreset {
  id: string;
  name: string;
  description: string;
  content: Publication;
}

export const EMPTY_PUBLICATION: Publication = {
  title: "Imo",
  message: "",
  currency: "BTC",
  isStaking: false,
  rate: "0",
  dailyUsdt: "0",
  downloadMbps: "0",
  uploadMbps: "0",
  watts: "0",
  energyTodayWh: "0",
};

function preset(
  id: string,
  name: string,
  description: string,
  values: Partial<Publication>,
): PublicationPreset {
  return {
    id,
    name,
    description,
    content: { ...EMPTY_PUBLICATION, ...values },
  };
}

export const PUBLICATION_PRESETS: PublicationPreset[] = [
  preset("btc-mining", "Bitcoin mining", "BTC proof-of-work profile", {
    title: "Imo BTC",
    currency: "BTC",
    rate: "450",
    message: "Bitcoin workload active",
  }),
  preset("eth-staking", "Ethereum staking", "ETH proof-of-stake profile", {
    title: "Imo ETH",
    currency: "ETH",
    isStaking: true,
    rate: "4.2",
    message: "Ethereum staking active",
  }),
  preset("sol-staking", "Solana staking", "SOL proof-of-stake profile", {
    title: "Imo SOL",
    currency: "SOL",
    isStaking: true,
    rate: "7.1",
    message: "Solana staking active",
  }),
  preset("doge-mining", "Dogecoin mining", "DOGE proof-of-work profile", {
    title: "Imo DOGE",
    currency: "DOGE",
    rate: "320",
    message: "Dogecoin workload active",
  }),
  preset("ltc-mining", "Litecoin mining", "LTC proof-of-work profile", {
    title: "Imo LTC",
    currency: "LTC",
    rate: "280",
    message: "Litecoin workload active",
  }),
  preset("xmr-mining", "Monero mining", "XMR proof-of-work profile", {
    title: "Imo XMR",
    currency: "XMR",
    rate: "12",
    message: "Monero workload active",
  }),
  preset("pearl-staking", "Pearl staking", "PEARL proof-of-stake profile", {
    title: "Imo PEARL",
    currency: "PEARL",
    isStaking: true,
    rate: "8",
    message: "Pearl staking active",
  }),
  preset("ready", "Ready", "Available for assigned work", {
    title: "Imo Compute",
    message: "System ready",
  }),
  preset("high-load", "High load", "Heavy workload in progress", {
    title: "Imo Compute",
    message: "High utilization workload",
  }),
  preset("maintenance", "Maintenance", "Planned maintenance", {
    title: "Imo Maintenance",
    message: "Scheduled maintenance in progress",
  }),
  preset("updating", "Updating", "Software update in progress", {
    title: "Imo Update",
    message: "Software update in progress",
  }),
  preset("network", "Network issue", "Connectivity is being restored", {
    title: "Imo Network",
    message: "Connectivity issue under review",
  }),
  preset("standby", "Standby", "Powered and waiting", {
    title: "Imo Standby",
    message: "Standing by for the next workload",
  }),
  preset("support", "Contact support", "Operator assistance required", {
    title: "Imo Support",
    message: "Please contact Imo support",
  }),
];
