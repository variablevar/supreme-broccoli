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
  activity: "",
  rate: "",
  dailyUsdt: "0",
  totalUsdt: "0",
};

export const PUBLICATION_PRESETS: PublicationPreset[] = [
  {
    id: "ready",
    name: "Ready",
    description: "Available for assigned work",
    content: {
      title: "Imo Compute",
      message: "System ready",
      activity: "Ready",
      rate: "Awaiting workload",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "active",
    name: "Active",
    description: "Normal active operation",
    content: {
      title: "Imo Compute",
      message: "Workload operating normally",
      activity: "Active",
      rate: "Nominal",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "high-load",
    name: "High load",
    description: "Heavy workload in progress",
    content: {
      title: "Imo Compute",
      message: "High utilization workload",
      activity: "High load",
      rate: "Peak capacity",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "scheduled",
    name: "Scheduled",
    description: "Work is queued",
    content: {
      title: "Imo Compute",
      message: "Workload scheduled",
      activity: "Scheduled",
      rate: "Queued",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "paused",
    name: "Paused",
    description: "Work is temporarily paused",
    content: {
      title: "Imo Compute",
      message: "Workload temporarily paused",
      activity: "Paused",
      rate: "0 active jobs",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "maintenance",
    name: "Maintenance",
    description: "Planned maintenance",
    content: {
      title: "Imo Maintenance",
      message: "Scheduled maintenance in progress",
      activity: "Maintenance",
      rate: "Temporarily unavailable",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "updating",
    name: "Updating",
    description: "Software update in progress",
    content: {
      title: "Imo Update",
      message: "Software update in progress",
      activity: "Updating",
      rate: "Please wait",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "inspection",
    name: "Inspection",
    description: "Hardware checks in progress",
    content: {
      title: "Imo Inspection",
      message: "Hardware inspection in progress",
      activity: "Diagnostics",
      rate: "Testing",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "network",
    name: "Network issue",
    description: "Connectivity is being restored",
    content: {
      title: "Imo Network",
      message: "Connectivity issue under review",
      activity: "Reconnect pending",
      rate: "No connection",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "standby",
    name: "Standby",
    description: "Powered and waiting",
    content: {
      title: "Imo Standby",
      message: "Standing by for the next workload",
      activity: "Standby",
      rate: "Idle",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "completed",
    name: "Completed",
    description: "Assigned work completed",
    content: {
      title: "Imo Complete",
      message: "Assigned workload completed",
      activity: "Complete",
      rate: "Finished",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "welcome",
    name: "Welcome",
    description: "Newly assigned display",
    content: {
      title: "Welcome to Imo",
      message: "Your display is connected",
      activity: "Connected",
      rate: "Ready",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
  {
    id: "support",
    name: "Contact support",
    description: "Operator assistance required",
    content: {
      title: "Imo Support",
      message: "Please contact Imo support",
      activity: "Action required",
      rate: "Support needed",
      dailyUsdt: "0",
      totalUsdt: "0",
    },
  },
];
