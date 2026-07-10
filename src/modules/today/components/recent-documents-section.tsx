import { DOC_STATUS_LABELS, RECENT_DOCUMENTS } from "../data";
import { SectionHeading, ToneChip } from "./section-heading";

/**
 * מסמכים אחרונים — a compact ledger: icon, name, matter,
 * type, time, status. Denser than matters, quieter than insights.
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
      <ul className="mt-5 flex-1 rounded-xl bg-surface-raised shadow-hairline">
        {RECENT_DOCUMENTS.map((doc, index) => {
          const status = DOC_STATUS_LABELS[doc.status];
          return (
            <li
              key={doc.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/50 ${
                index > 0 ? "border-t border-line/60" : ""
              }`}
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-micro font-medium text-paper-0"
                dir="ltr"
              >
                {doc.kind === "PDF" ? "PDF" : "DOC"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium text-foreground">
                  {doc.name}
                </p>
                <p className="truncate text-micro text-foreground-faint">
                  {doc.matter} · {doc.time}
                </p>
              </div>
              <ToneChip label={status.label} tone={status.tone} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
