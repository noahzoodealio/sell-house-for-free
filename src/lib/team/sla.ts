export type SlaBand = "green" | "amber" | "red";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface SlaInputs {
  assignedAt: string | null;
  unreadCount: number;
  lastTouchedAt: string | null;
  now?: number;
}

/**
 * SLA band per E11-S3 AC#3.
 *
 *   - red   : assigned ≥ 24h ago AND no team_activity_events from this user in ≥ 24h.
 *   - amber : (assigned < 24h ago) but in trouble: either unread inbound messages
 *             with no team-side response in > 4h, OR assigned 4h–24h ago.
 *   - green : assigned < 4h ago AND zero unread inbound messages.
 *
 * `assignedAt = null` is treated as just-assigned (green) — this should not
 * happen for rows surfaced by the queue (queue filter is `status in
 * ('assigned', 'active')` which forces assigned_at to be set), but if it does
 * the safer default is the optimistic band.
 */
export function computeSlaBand(inputs: SlaInputs): SlaBand {
  const now = inputs.now ?? Date.now();
  if (!inputs.assignedAt) return "green";
  const assignedAtMs = new Date(inputs.assignedAt).getTime();
  const sinceAssigned = now - assignedAtMs;

  const sinceTouched = inputs.lastTouchedAt
    ? now - new Date(inputs.lastTouchedAt).getTime()
    : Number.POSITIVE_INFINITY;

  if (sinceAssigned >= TWENTY_FOUR_HOURS_MS && sinceTouched >= TWENTY_FOUR_HOURS_MS) {
    return "red";
  }

  if (sinceAssigned < FOUR_HOURS_MS && inputs.unreadCount === 0) {
    return "green";
  }

  if (
    inputs.unreadCount > 0 &&
    sinceTouched > FOUR_HOURS_MS &&
    sinceAssigned < TWENTY_FOUR_HOURS_MS
  ) {
    return "amber";
  }

  if (sinceAssigned >= FOUR_HOURS_MS && sinceAssigned < TWENTY_FOUR_HOURS_MS) {
    return "amber";
  }

  return inputs.unreadCount > 0 ? "amber" : "green";
}

export const SLA_LABELS: Record<SlaBand, string> = {
  green: "On time (under 4h)",
  amber: "Watch (under 24h)",
  red: "Overdue (over 24h)",
};
