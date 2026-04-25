"use client";

import { useState, useTransition } from "react";

import { addTeamMember } from "@/app/team/admin/roster/actions";
import {
  COVERAGE_REGIONS,
  COVERAGE_REGION_LABELS,
} from "@/lib/team/coverage-regions";
import { VALID_ROLES, type RoleBadge } from "@/lib/team/roster";

export function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RoleBadge[]>(["pm"]);
  const [regions, setRegions] = useState<string[]>([]);
  const [capacityMax, setCapacityMax] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setRole(["pm"]);
    setRegions([]);
    setCapacityMax(10);
    setError(null);
  }

  function toggleRole(value: RoleBadge) {
    setRole((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  }

  function toggleRegion(value: string) {
    setRegions((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTeamMember({
        email,
        firstName,
        lastName,
        phone: phone.trim().length === 0 ? null : phone.trim(),
        role,
        coverageRegions: regions,
        capacityActiveMax: capacityMax,
      });
      if (!result.ok) {
        if (result.reason === "duplicate") {
          setError("That email is already on the roster.");
        } else if (result.reason === "validation") {
          setError("Check the form fields.");
        } else if (result.reason === "unauthorized") {
          setError("Not authorized.");
        } else {
          setError("Could not add member.");
        }
        return;
      }
      setOpen(false);
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white"
      >
        Add team member
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-ink-border bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-ink-heading">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            className="rounded-md border border-ink-border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-ink-heading">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={pending}
            className="rounded-md border border-ink-border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-ink-heading">First name</span>
          <input
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={pending}
            className="rounded-md border border-ink-border px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-ink-heading">Last name</span>
          <input
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={pending}
            className="rounded-md border border-ink-border px-2 py-1 text-sm"
          />
        </label>
      </div>

      <fieldset className="mt-3 text-xs">
        <legend className="font-medium text-ink-heading">Role badges</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {VALID_ROLES.map((badge) => (
            <label key={badge} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={role.includes(badge)}
                onChange={() => toggleRole(badge)}
                disabled={pending}
              />
              {badge}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3 text-xs">
        <legend className="font-medium text-ink-heading">
          Coverage regions
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {COVERAGE_REGIONS.map((region) => (
            <label key={region} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={regions.includes(region)}
                onChange={() => toggleRegion(region)}
                disabled={pending}
              />
              {COVERAGE_REGION_LABELS[region]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-3 flex items-center gap-2 text-xs">
        <span className="font-medium text-ink-heading">Capacity max</span>
        <input
          type="number"
          min={1}
          max={50}
          required
          value={capacityMax}
          onChange={(event) => setCapacityMax(Number(event.target.value))}
          disabled={pending}
          className="w-20 rounded-md border border-ink-border px-2 py-1 text-sm"
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add + invite"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={pending}
          className="text-xs text-ink-subtle underline"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
