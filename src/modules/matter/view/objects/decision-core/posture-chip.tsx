import { cx } from "@/design-system/utils/cx";
import type { PostureTone } from "../../types";

/**
 * The posture chip — the Decision Core's headline state. One tinted chip carrying
 * the matter's overall posture in the single semantic color permitted beside gold
 * (the two-accent law). State is conveyed by the word + the dot, never by color
 * alone.
 */
const TONE_WASH: Record<PostureTone, string> = {
  completed: "bg-status-completed-wash text-status-completed",
  today: "bg-status-today-wash text-status-today",
  risk: "bg-status-risk-wash text-status-risk",
  urgent: "bg-status-urgent-wash text-status-urgent",
  waiting: "bg-status-waiting-wash text-status-waiting",
  reviewed: "bg-status-reviewed-wash text-status-reviewed",
};

const TONE_DOT: Record<PostureTone, string> = {
  completed: "bg-status-completed",
  today: "bg-status-today",
  risk: "bg-status-risk",
  urgent: "bg-status-urgent",
  waiting: "bg-status-waiting",
  reviewed: "bg-status-reviewed",
};

export function PostureChip({ labelHe, tone }: { labelHe: string; tone: PostureTone }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-1 text-small font-semibold",
        TONE_WASH[tone],
      )}
    >
      <span aria-hidden className={cx("h-2 w-2 rounded-pill", TONE_DOT[tone])} />
      {labelHe}
    </span>
  );
}
