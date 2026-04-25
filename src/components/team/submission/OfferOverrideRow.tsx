"use client";

import { useState, useTransition } from "react";

import { updateOfferOverride } from "@/app/team/submissions/[id]/actions";
import {
  labelSellerPath,
  type SubmissionOffer,
} from "@/lib/team/submissions";

function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function OfferOverrideRow({ offer }: { offer: SubmissionOffer }) {
  const [note, setNote] = useState(offer.teamNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedNote, setSavedNote] = useState(offer.teamNote ?? "");

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateOfferOverride(offer.id, note);
      if (!result.ok) {
        setError("Save failed.");
        return;
      }
      setSavedNote(note);
    });
  }

  const dirty = note !== savedNote;

  return (
    <tr className="border-b border-ink-border last:border-b-0">
      <td className="py-2 pr-4">
        <span className="rounded-full bg-ink-subtle/10 px-2 py-0.5 text-xs">
          {labelSellerPath(offer.path)}
        </span>
      </td>
      <td className="py-2 pr-4 text-sm text-ink-heading">
        {formatCents(offer.lowCents)}
        {offer.highCents !== null && offer.highCents !== offer.lowCents
          ? ` – ${formatCents(offer.highCents)}`
          : null}
      </td>
      <td className="py-2 pr-4">
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          disabled={pending}
          placeholder="Team note (optional)"
          className="w-full rounded-md border border-ink-border px-2 py-1 text-xs"
        />
        {error ? (
          <span className="block text-xs text-red-600">{error}</span>
        ) : null}
      </td>
      <td className="py-2">
        {dirty ? (
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-md bg-brand-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "…" : "Save"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
