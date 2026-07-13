import { IconContainer } from "@/design-system/primitives/icon-container";
import { Button } from "@/design-system/primitives/button";
import { practiceGlyph } from "@/design-system/icons/practice";
import { PostureChip } from "./posture-chip";
import type { DecisionCoreVM } from "../../types";

/**
 * The Decision Core — the heart of the Matter App.
 * One surface that answers, in a glance: which matter, is it on track, what is
 * happening, and the one thing to do next — with who and any human review. It is
 * the room's single hero; the state chip is its headline and the action is its
 * one obvious next step. Nothing here that is not a five-second answer.
 */
export function DecisionCore({ vm }: { vm: DecisionCoreVM }) {
  const meta = [
    vm.clientHe,
    vm.practiceAreaHe,
    vm.ownerHe ? `אחראי/ת: ${vm.ownerHe}` : null,
  ].filter((part): part is string => Boolean(part));

  const actionMeta = vm.action
    ? [
        vm.action.ownerHe,
        vm.action.dueHe,
        vm.action.requiresApproval ? "טעון אישור" : null,
        vm.action.reviewTargetHe,
      ].filter((part): part is string => Boolean(part))
    : [];

  return (
    <section
      aria-labelledby="matter-identity"
      className="mx-auto max-w-reading rounded-xl bg-surface-raised p-7 shadow-raised md:p-9"
    >
      <div className="flex items-start gap-4">
        <IconContainer variant="matter" size="lg">
          {practiceGlyph(vm.practiceAreaHe, 20)}
        </IconContainer>
        <div className="min-w-0 flex-1">
          <PostureChip labelHe={vm.posture.labelHe} tone={vm.posture.tone} />
          <h1
            id="matter-identity"
            className="mt-3 text-balance text-title font-semibold leading-tight tracking-tight text-foreground"
          >
            {vm.titleHe}
          </h1>
          {meta.length > 0 ? (
            <p className="mt-2 text-small text-foreground-soft">{meta.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-7 text-subheading leading-relaxed text-foreground">{vm.concernHe}</p>

      {vm.action ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Button intent="primary">{vm.action.labelHe}</Button>
          {actionMeta.length > 0 ? (
            <span className="text-caption text-foreground-faint">{actionMeta.join(" · ")}</span>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-micro text-foreground-faint">
        {vm.stale ? "נתונים לא עדכניים · " : ""}
        עודכן {vm.updatedHe}
      </p>
    </section>
  );
}
