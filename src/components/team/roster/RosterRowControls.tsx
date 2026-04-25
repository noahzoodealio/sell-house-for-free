"use client";

import { useState, useTransition } from "react";

import {
  setTeamMemberActive,
  updateCapacityMax,
  updateCoverageRegions,
  updateRoles,
} from "@/app/team/admin/roster/actions";
import {
  COVERAGE_REGIONS,
  COVERAGE_REGION_LABELS,
} from "@/lib/team/coverage-regions";
import { VALID_ROLES, type RoleBadge, type RosterRow } from "@/lib/team/roster";

export function RosterRowControls({ row }: { row: RosterRow }) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [capacity, setCapacity] = useState(row.capacityActiveMax);
  const [capacityDirty, setCapacityDirty] = useState(false);

  function safeRun<T>(fn: () => Promise<T>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError("Action failed.");
      }
    });
  }

  function toggleRole(role: RoleBadge) {
    const next = row.role.includes(role)
      ? row.role.filter((r) => r !== role)
      : [...row.role, role];
    safeRun(async () => {
      const result = await updateRoles(row.id, next);
      if (!result.ok) {
        if (result.reason === "last_admin") {
          setError("Cannot remove the last active admin.");
        } else if (result.reason === "validation") {
          setError("Pick at least one role.");
        } else {
          setError("Role update failed.");
        }
      }
    });
  }

  function toggleRegion(region: string) {
    const next = row.coverageRegions.includes(region)
      ? row.coverageRegions.filter((r) => r !== region)
      : [...row.coverageRegions, region];
    safeRun(async () => {
      const result = await updateCoverageRegions(row.id, next);
      if (!result.ok) {
        setError("Coverage update failed.");
      }
    });
  }

  function saveCapacity() {
    safeRun(async () => {
      const result = await updateCapacityMax(row.id, capacity);
      if (!result.ok) {
        setError(
          result.reason === "validation"
            ? "Capacity must be 1–50."
            : "Capacity update failed.",
        );
        return;
      }
      setCapacityDirty(false);
    });
  }

  function toggleActive() {
    if (
      !confirm(
        row.active
          ? `Deactivate ${row.firstName} ${row.lastName}? Their session will be revoked.`
          : `Reactivate ${row.firstName} ${row.lastName}?`,
      )
    ) {
      return;
    }
    safeRun(async () => {
      const result = await setTeamMemberActive(row.id, !row.active);
      if (!result.ok) {
        setError(
          result.reason === "last_admin"
            ? "Cannot deactivate the last admin."
            : "Could not toggle active.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <fieldset>
        <legend className="font-medium text-ink-heading">Roles</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {VALID_ROLES.map((badge) => (
            <label key={badge} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={row.role.includes(badge)}
                onChange={() => toggleRole(badge)}
              />
              {badge}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-heading">Coverage</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {COVERAGE_REGIONS.map((region) => (
            <label key={region} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={row.coverageRegions.includes(region)}
                onChange={() => toggleRegion(region)}
              />
              {COVERAGE_REGION_LABELS[region]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          <span className="font-medium text-ink-heading">Capacity max</span>
          <input
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(event) => {
              setCapacity(Number(event.target.value));
              setCapacityDirty(true);
            }}
            className="w-16 rounded-md border border-ink-border px-2 py-1 text-xs"
          />
        </label>
        {capacityDirty ? (
          <button
            type="button"
            onClick={saveCapacity}
            className="rounded-md bg-brand-primary px-2 py-1 text-xs font-semibold text-white"
          >
            Save
          </button>
        ) : (
          <span className="text-ink-subtle">
            ({row.capacityActiveCurrent} / {row.capacityActiveMax} in use)
          </span>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={toggleActive}
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            row.active
              ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
              : "bg-brand-primary text-white"
          }`}
        >
          {row.active ? "Deactivate" : "Reactivate"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
