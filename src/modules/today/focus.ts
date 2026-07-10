import type { Status } from "@/design-system/primitives/indicators";
import {
  ACTIVE_MATTERS,
  AI_INSIGHTS,
  MEETINGS,
  RECENT_DOCUMENTS,
  TIMELINE_EVENTS,
  type Insight,
  type Matter,
  type Meeting,
  type RecentDocument,
  type TimelineEvent,
} from "./data";

/* ============================================================
   V7 focus model — the central workspace transforms around one
   focused object: a timeline event or a matter. Pure derivation
   over the existing typed mock data; no new business logic.
   ============================================================ */

export type FocusRef =
  | { kind: "event"; id: string }
  | { kind: "matter"; id: string };

/** The day's default focus — the hearing. */
export const DEFAULT_FOCUS: FocusRef = { kind: "event", id: "ev-3" };

/** Timeline event → matter (explicit, data stays untouched). */
const EVENT_MATTER: Record<string, string> = {
  "ev-3": "m-1",
  "ev-4": "m-3",
  "ev-5": "m-2",
};

/** Matter → documents (explicit provenance mapping). */
const MATTER_DOCS: Record<string, string[]> = {
  "m-1": ["d-2", "d-4"],
  "m-2": ["d-1"],
  "m-3": ["d-3"],
  "m-4": ["d-5"],
  "m-5": [],
};

const MATTER_INSIGHTS: Record<string, string[]> = {
  "m-1": ["i-1"],
  "m-2": ["i-2"],
  "m-3": ["i-3"],
  "m-4": [],
  "m-5": [],
};

/** Matter → today's meeting, when one exists. */
const MATTER_MEETING: Record<string, string> = {
  "m-3": "mt-1",
};

export function matterById(id: string): Matter | undefined {
  return ACTIVE_MATTERS.find((m) => m.id === id);
}

export function eventById(id: string): TimelineEvent | undefined {
  return TIMELINE_EVENTS.find((e) => e.id === id);
}

export function matterForEvent(eventId: string): Matter | undefined {
  const matterId = EVENT_MATTER[eventId];
  return matterId ? matterById(matterId) : undefined;
}

export function docsForMatter(matterId: string): RecentDocument[] {
  const ids = MATTER_DOCS[matterId] ?? [];
  return RECENT_DOCUMENTS.filter((d) => ids.includes(d.id));
}

export function insightsForMatter(matterId: string): Insight[] {
  const ids = MATTER_INSIGHTS[matterId] ?? [];
  return AI_INSIGHTS.filter((i) => ids.includes(i.id));
}

export function meetingForMatter(matterId: string): Meeting | undefined {
  const id = MATTER_MEETING[matterId];
  return id ? MEETINGS.find((m) => m.id === id) : undefined;
}

/** Resolve any focus to the matter whose context should be shown. */
export function focusedMatter(focus: FocusRef): Matter | undefined {
  return focus.kind === "matter"
    ? matterById(focus.id)
    : matterForEvent(focus.id);
}

/* ============================================================
   Matter Health — operational states, derived from existing
   mock fields. Each state carries a distinct visual treatment.
   ============================================================ */

export type HealthStateKey =
  | "ready-hearing"
  | "deadline-risk"
  | "waiting-client"
  | "waiting-decision"
  | "evidence-gap"
  | "internal-review"
  | "ready-to-file";

export type HealthState = {
  key: HealthStateKey;
  label: string;
  status: Status;
  /** whether the state pulses (live risk) */
  pulse: boolean;
};

const HEALTH_STATES: Record<string, HealthState> = {
  "m-1": { key: "ready-hearing", label: "מוכן לדיון", status: "completed", pulse: false },
  "m-2": { key: "deadline-risk", label: "סיכון מועד — 16:00", status: "urgent", pulse: true },
  "m-3": { key: "waiting-client", label: "ממתין ללקוחה", status: "waiting", pulse: false },
  "m-4": { key: "waiting-decision", label: "ממתין להחלטת הרשם", status: "scheduled", pulse: false },
  "m-5": { key: "evidence-gap", label: "פער ראיות", status: "risk", pulse: false },
};

export function healthState(matter: Matter): HealthState {
  return (
    HEALTH_STATES[matter.id] ?? {
      key: "internal-review",
      label: "בבדיקה פנימית",
      status: "progress",
      pulse: false,
    }
  );
}

/** The matter's procedural milestone track (visual, not business logic). */
export type MilestoneTrack = { steps: string[]; current: number };

const MILESTONES: Record<string, MilestoneTrack> = {
  "m-1": { steps: ["כתבי טענות", "הוכחות", "סיכומים", "פסק דין"], current: 1 },
  "m-2": { steps: ["כתבי טענות", "ראיות", "סיכומים", "פסק דין"], current: 2 },
  "m-3": { steps: ["היכרות", "טיוטה", "משא ומתן", "חתימה"], current: 1 },
  "m-4": { steps: ["הגשה", "רשם הירושה", "צו"], current: 1 },
  "m-5": { steps: ["תביעה", "גישור", "הסדר"], current: 1 },
};

export function milestoneTrack(matter: Matter): MilestoneTrack {
  return MILESTONES[matter.id] ?? { steps: [matter.stage], current: 0 };
}

/* ============================================================
   The board's operational tiers — one featured, two supporting,
   the rest in a compact queue. Order comes from the data.
   ============================================================ */

export const BOARD = {
  featured: ACTIVE_MATTERS[0],
  supporting: ACTIVE_MATTERS.slice(1, 3),
  queue: ACTIVE_MATTERS.slice(3),
};

/** Prepared-work objects for the Today Focus scene (hearing day). */
export type PreparedItem = {
  id: string;
  kind: "document" | "draft" | "precedent" | "client";
  kindLabel: string;
  title: string;
  meta: string;
  status: Status;
  ai?: boolean;
};

export const PREPARED_WORK: PreparedItem[] = [
  {
    id: "pw-1",
    kind: "document",
    kindLabel: "PDF",
    title: "תצהיר עדות ראשית",
    meta: "v3 · הוגש",
    status: "completed",
  },
  {
    id: "pw-2",
    kind: "document",
    kindLabel: "PDF",
    title: "כתב הגנה — הנתבעת",
    meta: "התקבל 07:12",
    status: "new",
  },
  {
    id: "pw-3",
    kind: "draft",
    kindLabel: "DOCX",
    title: "טיוטת תגובה לדיון",
    meta: "v2 · מוכנה לאישור",
    status: "progress",
    ai: true,
  },
  {
    id: "pw-4",
    kind: "precedent",
    kindLabel: "פסיקה",
    title: "ע״א 4881/25",
    meta: "מחזק התיישנות",
    status: "reviewed",
    ai: true,
  },
  {
    id: "pw-5",
    kind: "client",
    kindLabel: "לקוח",
    title: "עדכון ליעקב כהן",
    meta: "טיוטה מוכנה",
    status: "waiting",
    ai: true,
  },
];
