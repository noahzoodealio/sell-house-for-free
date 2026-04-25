"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  labelSellerPath,
  STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/team/submissions-shared";
import { SLA_LABELS, type SlaBand } from "@/lib/team/sla";

export interface WorkQueueRow {
  submissionRowId: string;
  submissionId: string;
  sellerFirstName: string;
  sellerFullName: string;
  addressLine1: string;
  city: string;
  state: string;
  pillarHint: string | null;
  sellerPaths: string[];
  assignedAt: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastTouchedAt: string | null;
  assigneeName: string | null;
  slaBand: SlaBand;
  status: SubmissionStatus;
}

const SLA_DOT_CLASS: Record<SlaBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function relative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function WorkQueueTable({
  rows,
  showAssignee,
}: {
  rows: WorkQueueRow[];
  showAssignee: boolean;
}) {
  const [cursor, setCursor] = useState(0);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const router = useRouter();
  // Derive a clamped cursor instead of mutating state in an effect — the
  // rows list shrinks when a submission closes; a stale cursor index
  // would highlight the wrong (or no) row.
  const boundedCursor = rows.length === 0 ? 0 : Math.min(cursor, rows.length - 1);

  function onKeyDown(event: React.KeyboardEvent<HTMLTableSectionElement>) {
    if (rows.length === 0) return;
    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(rows.length - 1, current + 1));
    } else if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[boundedCursor];
      if (row) router.push(`/team/submissions/${row.submissionRowId}`);
    }
  }

  return (
    <div role="region" aria-label="Work queue" className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-ink-border bg-ink-subtle/5 text-left text-xs uppercase tracking-wide text-ink-subtle">
            <th scope="col" className="px-3 py-2">SLA</th>
            <th scope="col" className="px-3 py-2">Seller</th>
            <th scope="col" className="px-3 py-2">Property</th>
            <th scope="col" className="px-3 py-2">Paths</th>
            <th scope="col" className="px-3 py-2">Assigned</th>
            <th scope="col" className="px-3 py-2">Last activity</th>
            <th scope="col" className="px-3 py-2">Unread</th>
            {showAssignee ? (
              <th scope="col" className="px-3 py-2">Assignee</th>
            ) : null}
            <th scope="col" className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody
          ref={tbodyRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="focus:outline-none"
          aria-label="Submissions list — j/k to navigate, Enter to open"
        >
          {rows.map((row, index) => {
            const isCursor = index === boundedCursor;
            return (
              <tr
                key={row.submissionRowId}
                onClick={() =>
                  router.push(`/team/submissions/${row.submissionRowId}`)
                }
                className={`cursor-pointer border-b border-ink-border last:border-b-0 ${
                  isCursor ? "bg-brand-primary/5" : "hover:bg-ink-subtle/5"
                }`}
              >
                <td className="px-3 py-2">
                  <span
                    aria-label={`SLA: ${SLA_LABELS[row.slaBand]}`}
                    className={`inline-block h-3 w-3 rounded-full ${SLA_DOT_CLASS[row.slaBand]}`}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-ink-heading">
                  {row.sellerFirstName || "—"}
                </td>
                <td className="px-3 py-2 text-ink-body">
                  {truncate(`${row.addressLine1}, ${row.city} ${row.state}`, 40)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.sellerPaths.map((path) => (
                      <span
                        key={path}
                        className="rounded-full bg-ink-subtle/10 px-2 py-0.5 text-xs"
                      >
                        {labelSellerPath(path)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-ink-subtle">
                  {relative(row.assignedAt)}
                </td>
                <td className="px-3 py-2 text-ink-subtle">
                  {relative(row.lastMessageAt ?? row.lastTouchedAt)}
                </td>
                <td className="px-3 py-2">
                  {row.unreadCount > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {row.unreadCount}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-subtle">—</span>
                  )}
                </td>
                {showAssignee ? (
                  <td className="px-3 py-2 text-ink-subtle">
                    {row.assigneeName ?? "—"}
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <span className="rounded-full bg-ink-subtle/10 px-2 py-0.5 text-xs">
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
