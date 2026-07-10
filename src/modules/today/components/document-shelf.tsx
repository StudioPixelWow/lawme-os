import Link from "next/link";
import { AIMark, MicroProgress, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { RECENT_DOCUMENTS, type RecentDocument } from "../data";
import { SectionHeading } from "./section-heading";

/** Review progress per document state — visual, not business logic. */
const REVIEW_PROGRESS: Record<string, number> = {
  new: 0.1,
  progress: 0.55,
  reviewed: 0.85,
  completed: 1,
  signed: 1,
};

/**
 * One document — a physical sheet on the shelf. Layered paper edges
 * give it thickness; the face carries a quiet preview; hover lifts
 * it off the shelf and surfaces עמית's note or the action.
 */
function DocumentObject({ doc }: { doc: RecentDocument }) {
  const review = REVIEW_PROGRESS[doc.status] ?? 0.4;
  return (
    <li className="group relative min-w-56 flex-1 snap-start">
      {/* sheets behind — the object has depth */}
      <span
        aria-hidden
        className="absolute inset-x-2 -bottom-1.5 h-4 rounded-md bg-paper-300/80 shadow-seat transition-transform group-hover:translate-y-0.5"
        style={{ transitionDuration: "var(--motion-quick)" }}
      />
      <span
        aria-hidden
        className="absolute inset-x-1 -bottom-0.5 h-4 rounded-md bg-paper-100 shadow-seat"
      />
      <Link
        href="/documents"
        className="living-edge surface-paper-raised relative flex h-full flex-col rounded-md p-4 transition-all group-hover:-translate-y-1.5 group-hover:shadow-lift"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        {/* the paper face — a quiet preview of the first lines */}
        <div aria-hidden className="flex flex-col gap-1.5">
          <span className="h-1 w-3/5 rounded-pill bg-ink-200/70" />
          <span className="h-1 w-full rounded-pill bg-ink-100" />
          <span className="h-1 w-4/5 rounded-pill bg-ink-100" />
          <span className="h-1 w-full rounded-pill bg-ink-100/70 transition-opacity group-hover:opacity-0" />
        </div>

        {/* עמית's issue marker / the action — revealed on hover */}
        <p
          className="pointer-events-none mt-1 h-0 overflow-hidden text-micro leading-snug text-foreground-soft opacity-0 transition-all group-hover:h-auto group-hover:opacity-100"
          style={{ transitionDuration: "var(--motion-quick)" }}
        >
          {doc.aiNote ? (
            <span className="flex items-start gap-1">
              <AIMark className="mt-0.5" />
              <span className="min-w-0">{doc.aiNote}</span>
            </span>
          ) : (
            <span className="font-medium text-gold-700">{doc.action} ←</span>
          )}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span
            className={cx(
              "rounded-xs px-1.5 py-0.5 text-micro font-semibold tracking-wide",
              doc.kind === "PDF"
                ? "bg-status-urgent-wash text-status-urgent"
                : "bg-status-progress-wash text-status-progress",
            )}
          >
            {doc.kind}
          </span>
          <span className="text-micro tabular-nums text-foreground-faint">
            {doc.version} · {doc.time}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5">
          <span className="min-w-0 truncate text-small font-semibold text-foreground">
            {doc.name}
          </span>
          {doc.aiNote ? <AIMark className="shrink-0" /> : null}
        </p>
        <p className="mt-0.5 truncate text-micro text-foreground-faint">
          {doc.matter} · {doc.owner}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-2.5">
          <StatusText status={doc.status}>{doc.statusLabel}</StatusText>
          <MicroProgress value={review} label="התקדמות סקירה" showValue={false} />
        </div>
      </Link>
    </li>
  );
}

/**
 * The document workspace — a shelf of physical work objects, not a
 * list. The paper has thickness, the face previews content, and the
 * shelf catches their weight.
 */
export function DocumentShelf() {
  return (
    <section aria-label="שולחן המסמכים">
      <SectionHeading
        title="שולחן המסמכים"
        caption="מה שנגע בו המשרד לאחרונה · לפי תיק"
        href="/documents"
        linkLabel="כל המסמכים"
      />

      <div className="mt-6">
        <ul className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
          {RECENT_DOCUMENTS.map((doc) => (
            <DocumentObject key={doc.id} doc={doc} />
          ))}
        </ul>
        {/* the shelf itself */}
        <div
          aria-hidden
          className="reflection-floor -mt-1 h-5 rounded-b-lg"
        />
      </div>
    </section>
  );
}
