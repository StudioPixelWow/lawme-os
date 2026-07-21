"use client";

/**
 * Organization-selection form (Capability 0.8, Slice 0.8.2) — CLIENT.
 *
 * Renders the caller's eligible organizations (already authorized server-side)
 * and POSTs the chosen organizationId to the selection API. The API re-verifies
 * active membership before writing the cookie — this form is UX, not the gate.
 * On success we do a full navigation to /today so the server boundary re-renders
 * with the new active organization.
 */
import { useState } from "react";
import { Button } from "@/design-system/primitives/button";

export interface OrganizationChoice {
  readonly organizationId: string;
  readonly name: string;
  readonly roleLabel: string;
}

const GENERIC_ERROR = "לא ניתן היה לבחור את הארגון. נסה שוב.";

export function SelectOrganizationForm({ choices }: { choices: readonly OrganizationChoice[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(organizationId: string) {
    if (pendingId) return;
    setError(null);
    setPendingId(organizationId);
    try {
      const res = await fetch("/api/identity/active-organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        setError(GENERIC_ERROR);
        setPendingId(null);
        return;
      }
      window.location.assign("/today");
    } catch {
      setError(GENERIC_ERROR);
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-small text-critical">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {choices.map((choice) => (
          <li key={choice.organizationId}>
            <Button
              intent="quiet"
              disabled={pendingId !== null}
              onClick={() => choose(choice.organizationId)}
              className="h-auto w-full flex-col items-start gap-0.5 px-4 py-3 text-start"
            >
              <span className="text-body font-medium text-foreground">{choice.name}</span>
              <span className="text-small text-foreground-soft">{choice.roleLabel}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
