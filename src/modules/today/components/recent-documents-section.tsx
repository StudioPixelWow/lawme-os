import Link from "next/link";
import { AIMark, StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { RECENT_DOCUMENTS } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * מסמכים אחרונים — a Finder-like document workspace: documents as
 * compact sheet objects (not database rows), each with type, version,
 * matter, owner, state, an AI note when עמית found something, and
 * the main action on hover.
 */
export function RecentDocumentsSection() {
  return (
    <section aria-label="מסמכים אחרונים">
      <SectionHeading
        title="מסמכים אחרונים"
        caption="מהיממה האחרונה · שניים ממתינים לטיפולך"
        href="/documents"
        linkLabel="לספרייה"
      />
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {RECENT_DOCUMENTS.map((doc) => (
          <li key={doc.id} className="min-w-0">
            <article
              className="group surface-paper-raised flex h-full flex-col rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <div className="flex items-start justify-between gap-2">
                {/* the sheet: file-type tile with a folded-corner feel */}
                <span
                  className={cx(
                    "flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-xs shadow-seat",
                    doc.kind === "PDF"
                      ? "bg-ink-900 text-paper-0"
                      : "bg-status-scheduled-wash text-status-scheduled",
                  )}
                  dir="ltr"
                >
                  <span className="font-mono text-micro font-medium">
                    {doc.kind === "PDF" ? "PDF" : "DOC"}
                  </span>
                  <span
                    className={cx(
                      "font-mono text-micro tabular-nums",
                      doc.kind === "PDF"
                        ? "text-ink-200"
                        : "text-foreground-faint",
                    )}
                  >
                    {doc.version}
                  </span>
                </span>
                <StatusText status={doc.status}>{doc.statusLabel}</StatusText>
              </div>

              <p className="mt-3 line-clamp-2 text-small font-semibold leading-snug text-foreground">
                {doc.name}
              </p>
              <p className="mt-1 truncate text-micro text-foreground-faint">
                {doc.matter}
              </p>

              {doc.aiNote ? (
                <p className="mt-2 flex items-start gap-1.5 border-s-2 border-accent ps-2 text-micro leading-relaxed text-foreground-soft">
                  <AIMark className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{doc.aiNote}</span>
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between border-t border-line/50 pt-2.5">
                <span className="truncate text-micro text-foreground-faint">
                  עו״ד {doc.owner} · {doc.time}
                </span>
                <Link
                  href="/documents"
                  className="shrink-0 rounded-xs text-micro font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {doc.action} ←
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
