import { Workspace } from "@/design-system/patterns/workspace";

/**
 * Loading is the entrance choreography: a skeleton that mirrors
 * the real editorial layout. Docs: docs/design-system/10-states.md
 */
export default function Loading() {
  return (
    <Workspace>
      <span className="sr-only" role="status">
        טוען…
      </span>
      <div className="h-14 w-64 animate-pulse rounded-sm bg-paper-200" />
      <div className="mt-5 h-6 w-96 max-w-full animate-pulse rounded-xs bg-paper-100" />

      {[0, 1].map((chapter) => (
        <div key={chapter} className="mt-section">
          <div className="h-9 w-48 animate-pulse rounded-sm bg-paper-200" />
          <div className="mt-8 h-44 animate-pulse rounded-lg bg-paper-100" />
        </div>
      ))}
    </Workspace>
  );
}
