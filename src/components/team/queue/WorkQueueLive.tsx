"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 60_000;

/**
 * Lightweight live-refresh wrapper for the work queue.
 * Updates document.title with the unread total, then triggers
 * router.refresh() every minute so the Server Component re-runs and
 * surfaces new inbound messages / SLA band changes.
 */
export function WorkQueueLive({ unreadTotal }: { unreadTotal: number }) {
  const router = useRouter();

  useEffect(() => {
    const prefix = unreadTotal > 0 ? `(${unreadTotal}) ` : "";
    const original = document.title;
    document.title = `${prefix}Work queue — Sell Free Team`;
    return () => {
      document.title = original;
    };
  }, [unreadTotal]);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
