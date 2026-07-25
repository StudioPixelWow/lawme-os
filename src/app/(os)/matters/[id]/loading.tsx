import { Workspace } from "@/design-system/patterns/workspace";

/**
 * The Matter Workspace entrance skeleton — structure-true, mirroring the real
 * layout (navy hero band + two-column canvas). No shimmer race; the shell never
 * skeletons. Docs: docs/design-system/10-states.md
 */
export default function Loading() {
  return (
    <Workspace width="wide">
      <span className="sr-only" role="status">טוען את התיק…</span>

      {/* hero band */}
      <div className="h-40 animate-pulse rounded-xl bg-ink-900/80" />

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-paper-100/70" />
          ))}
        </div>
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-paper-100/70" />
          ))}
        </div>
      </div>
    </Workspace>
  );
}
