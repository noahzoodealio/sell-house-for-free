"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { initiateHandoff } from "@/app/team/submissions/[id]/handoff/actions";
import {
  HANDOFF_REASONS,
  type CandidateTeamMember,
  type HandoffReason,
} from "@/lib/team/handoff";

const REASON_OPTIONS: Array<{ value: HandoffReason; label: string }> = [
  { value: "vacation", label: "Vacation / time off" },
  { value: "expertise_mismatch", label: "Expertise mismatch" },
  { value: "coverage_region_gap", label: "Coverage region gap" },
  { value: "seller_request", label: "Seller request" },
  { value: "performance_issue", label: "Performance issue" },
  { value: "other", label: "Other" },
];

export function HandoffForm({
  submissionRowId,
  candidates,
  isAdmin,
}: {
  submissionRowId: string;
  candidates: CandidateTeamMember[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [toId, setToId] = useState<string>(candidates[0]?.id ?? "");
  const [reason, setReason] = useState<HandoffReason>("vacation");
  const [note, setNote] = useState("");
  const [sendReintro, setSendReintro] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedCandidate = candidates.find((c) => c.id === toId);
  const atCapacity = selectedCandidate
    ? selectedCandidate.capacityCurrent >= selectedCandidate.capacityMax
    : false;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!toId) {
      setError("Pick a team member to hand off to.");
      return;
    }
    if (!HANDOFF_REASONS.includes(reason)) {
      setError("Pick a reason.");
      return;
    }
    if (reason === "other" && note.trim().length === 0) {
      setError("Note is required when reason is Other.");
      return;
    }
    if (atCapacity && (!isAdmin || !adminOverride)) {
      setError(
        isAdmin
          ? "Confirm admin override to hand off to an at-capacity team member."
          : "That team member is at capacity. Pick another or escalate to an admin.",
      );
      return;
    }

    startTransition(async () => {
      const result = await initiateHandoff({
        submissionRowId,
        toTeamMemberId: toId,
        reason,
        note: note.trim().length > 0 ? note.trim() : null,
        sendSellerReintro: sendReintro,
        adminOverride: atCapacity && isAdmin && adminOverride,
      });
      if (!result.ok) {
        if (result.reason === "self_handoff") {
          setError("You can't hand off to yourself.");
        } else if (result.reason === "target_inactive") {
          setError("Target team member is no longer active.");
        } else if (result.reason === "at_capacity") {
          setError("Target team member is at capacity.");
        } else if (result.reason === "validation") {
          setError("Check the form fields.");
        } else if (result.reason === "unauthorized") {
          setError("You no longer have permission to hand off this submission.");
        } else {
          setError("Handoff failed. Try again.");
        }
        return;
      }
      router.push(`/team/submissions/${submissionRowId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-heading">
          Hand off to
        </span>
        <select
          value={toId}
          onChange={(event) => setToId(event.target.value)}
          disabled={pending || candidates.length === 0}
          className="rounded-md border border-ink-border bg-white px-3 py-2 text-sm"
          required
        >
          {candidates.length === 0 ? (
            <option value="">No other active team members.</option>
          ) : null}
          {candidates.map((candidate) => {
            const cap = `${candidate.capacityCurrent}/${candidate.capacityMax}`;
            const atCap =
              candidate.capacityCurrent >= candidate.capacityMax;
            return (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName} — {cap}
                {atCap ? " (at capacity)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      {selectedCandidate ? (
        <p className="text-xs text-ink-subtle">
          Coverage: {selectedCandidate.coverageRegions.length === 0
            ? "(unset)"
            : selectedCandidate.coverageRegions.join(", ")}
          {selectedCandidate.isAdmin ? " · admin" : ""}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-heading">Reason</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value as HandoffReason)}
          disabled={pending}
          className="rounded-md border border-ink-border bg-white px-3 py-2 text-sm"
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink-heading">
          Note {reason === "other" ? "(required)" : "(optional)"}
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={pending}
          rows={3}
          maxLength={500}
          placeholder="Context for the next team member"
          className="rounded-md border border-ink-border bg-white px-3 py-2 text-sm"
        />
        <span className="text-xs text-ink-subtle">
          {note.length} / 500
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={sendReintro}
          onChange={(event) => setSendReintro(event.target.checked)}
          disabled={pending}
          className="mt-1"
        />
        <span>
          <span className="block font-medium text-ink-heading">
            Send seller a re-introduction email
          </span>
          <span className="text-xs text-ink-subtle">
            If unchecked, the new team member can introduce themselves on
            their own schedule.
          </span>
        </span>
      </label>

      {atCapacity && isAdmin ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={adminOverride}
            onChange={(event) => setAdminOverride(event.target.checked)}
            disabled={pending}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink-heading">
              Admin: override capacity
            </span>
            <span className="text-xs text-ink-subtle">
              Confirms you accept that {selectedCandidate?.fullName} is
              already at {selectedCandidate?.capacityCurrent} of{" "}
              {selectedCandidate?.capacityMax}.
            </span>
          </span>
        </label>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || candidates.length === 0}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Handing off…" : "Hand off"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="text-sm text-ink-subtle underline disabled:opacity-60"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
