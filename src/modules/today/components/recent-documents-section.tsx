import Link from "next/link";
import { StatusText } from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import { RECENT_DOCUMENTS } from "../data";
import { SectionHeading } from "./section-heading";

/**
 * מסמכים אחרונים — rows that feel like documents, not records:
 * refined file-type tile, name, matter, owner, version, state,
 * and the main action on hover.
 */
export function RecentDocumentsSection() {
  return (
    <section aria-label="מסמכים אחרונים" className="flex h-full flex-col">
      <SectionHeading
        title="מסמכים אחרונים"
        caption="מהיממה האחרונה"
        href="/documents"
        linkLabel="לספרייה"
      />
      <ul className="surface-paper mt-5 flex-1 rounded-xl">
        {RECENT_DOCUMENTS.map((doc, index) => (
          <li
            key={doc.id}
            className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/50 ${
              index > 0 ? "border-t border-line/60" : ""
            }`}
            style={{ transitionDuration: "var(--motion-quick)" }}
          >
            {/* file-type tile: a small "sheet" with a folded corner feel */}
            <span
              className={cx(
                "flex h-10 w-9 shrink-0 flex-col items-center justify-center rounded-xs shadow-seat",
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
                  "mt-0.5 font-mono text-micro tabular-nums",
                  doc.kind === "PDF" ? "text-ink-200" : "text-foreground-faint",
                )}
              >
                {doc.version}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium text-foreground">
                {doc.name}
              </p>
              <p className="truncate text-micro text-foreground-faint">
                {doc.matter} · עו״ד {doc.owner} · {doc.time}
              </p>
            </div>
            <Link
              href="/documents"
              className="rounded-xs text-micro font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {doc.action} ←
            </Link>
            <StatusText status={doc.status}>{doc.statusLabel}</StatusText>
          </li>
        ))}
      </ul>
    </section>
  );
}
