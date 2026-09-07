import type { Device } from "@/modules/accounts/types";
import { Panel, Status } from "./ui";
export function DeviceCard({ device }: { device: Device }) {
  const d = device;
  return (
    <Panel title={d.name} description={d.uid}>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Status>
          {d.revoked_at ? "Revoked" : d.online ? "Online" : "Offline"}
        </Status>
        <span className="text-xs text-muted-foreground">
          Algorithm Patch v{d.version ?? 0} · Applied v{d.applied_version ?? 0}
        </span>
      </div>
      {d.content ? (
        <div className="space-y-4">
          <div>
            <h3 data-no-translate className="font-space text-xl">
              {d.content.title}
            </h3>
            <p data-no-translate className="mt-2 text-sm text-muted-foreground">
              {d.content.message}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">Activity</p>
              <p data-no-translate className="mt-1 text-sm">
                {d.content.currency}{" "}
                {d.content.isStaking ? "staking" : "mining"} · {d.content.rate}{" "}
                {d.content.isStaking ? "% APR" : "MH/s"}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">
                Estimated daily USDT
              </p>
              <p data-no-translate className="mt-1 font-mono text-sm">
                {d.content.dailyUsdt}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Daily rewards require 24 accumulated online hours. Account credits
            appear in the transaction ledger.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for the first operator publication.
        </p>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Last contact:{" "}
        <span data-no-translate>
          {d.last_seen
            ? new Date(d.last_seen).toLocaleString()
            : "Not yet connected"}
        </span>
      </p>
    </Panel>
  );
}
