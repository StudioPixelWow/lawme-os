/**
 * Matter Room — tone → design-system status class maps.
 * A `Tone` is exactly a design-system status; these maps let the room's objects
 * paint dots, text and washes consistently on light and navy surfaces without
 * re-deriving anything. Presentation only.
 */
import type { Tone } from "../types";

export const DOT: Record<Tone, string> = {
  urgent: "bg-status-urgent",
  today: "bg-status-today",
  waiting: "bg-status-waiting",
  progress: "bg-status-progress",
  new: "bg-status-new",
  completed: "bg-status-completed",
  risk: "bg-status-risk",
  scheduled: "bg-status-scheduled",
  reviewed: "bg-status-reviewed",
  signed: "bg-status-signed",
};

export const DOT_NAVY: Record<Tone, string> = {
  urgent: "bg-status-urgent-onnavy",
  today: "bg-status-today-onnavy",
  waiting: "bg-status-waiting-onnavy",
  progress: "bg-status-progress-onnavy",
  new: "bg-status-new-onnavy",
  completed: "bg-status-completed-onnavy",
  risk: "bg-status-risk-onnavy",
  scheduled: "bg-status-scheduled-onnavy",
  reviewed: "bg-status-reviewed-onnavy",
  signed: "bg-status-signed-onnavy",
};

export const TEXT: Record<Tone, string> = {
  urgent: "text-status-urgent",
  today: "text-status-today",
  waiting: "text-status-waiting",
  progress: "text-status-progress",
  new: "text-status-new",
  completed: "text-status-completed",
  risk: "text-status-risk",
  scheduled: "text-status-scheduled",
  reviewed: "text-status-reviewed",
  signed: "text-status-signed",
};

export const WASH: Record<Tone, string> = {
  urgent: "bg-status-urgent-wash",
  today: "bg-status-today-wash",
  waiting: "bg-status-waiting-wash",
  progress: "bg-status-progress-wash",
  new: "bg-status-new-wash",
  completed: "bg-status-completed-wash",
  risk: "bg-status-risk-wash",
  scheduled: "bg-status-scheduled-wash",
  reviewed: "bg-status-reviewed-wash",
  signed: "bg-status-signed-wash",
};
