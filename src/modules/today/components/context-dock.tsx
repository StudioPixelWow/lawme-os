import Link from "next/link";
import {
  CalendarGlyph,
  DocumentGlyph,
  HourglassGlyph,
  PhoneGlyph,
} from "@/design-system/icons/glyphs";
import {
  AIMark,
  ConfidenceBar,
  MicroProgress,
  StatusText,
} from "@/design-system/primitives/indicators";
import { cx } from "@/design-system/utils/cx";
import type { Matter } from "../data";
import {
  docsForMatter,
  insightsForMatter,
  meetingForMatter,
} from "../focus";

function DockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-micro font-semibold tracking-wide text-foreground-faint">
      {children}
    </p>
  );
}

/**
 * The Context Dock — the dynamic supporting layer of the central
 * workspace. It re-aims itself at whatever is focused: documents,
 * findings, participants, deadlines, missing items, one suggested
 * action. Floating glass — live context, not another sidebar.
 */
export function ContextDock({
  matter,
  className,
}: {
  matter: Matter;
  className?: string;
}) {
  const docs = docsForMatter(matter.id);
  const insights = insightsForMatter(matter.id);
  const meeting = meetingForMatter(matter.id);

  return (
    <aside
      aria-label="הקשר פעיל"
      aria-live="polite"
      className={cx(
        "glass relative flex min-w-0 flex-col gap-5 self-start rounded-xl p-5",
        className,
      )}
    >
      {/* the meridian marks the dock as live */}
      <span
        aria-hidden
        className="absolute inset-y-6 start-0 w-0.5 rounded-pill bg-gold-500/70"
      />

      <header className="min-w-0">
        <DockLabel>ההקשר הפעיל</DockLabel>
        <h2 className="mt-1.5 truncate text-subheading font-semibold tracking-tight text-foreground">
          {matter.name}
        </h2>
        <p className="mt-0.5 truncate text-caption text-foreground-soft">
          {matter.client} · {matter.practiceArea} · {matter.stage}
        </p>
      </header>

      {/* documents in context */}
      {docs.length > 0 ? (
        <div>
          <DockLabel>מסמכים בתיק</DockLabel>
          <ul className="mt-2 flex flex-col gap-1.5">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link
                  href="/documents"
                  className="living-edge surface-paper flex items-center gap-2.5 rounded-md p-2.5 transition-all hover:-translate-y-px hover:shadow-lift"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-foreground-soft">
                    <DocumentGlyph size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-1.5">
                      <span className="min-w-0 text-caption leading-snug font-medium text-foreground">
                        {doc.name}
                      </span>
                      {doc.aiNote ? <AIMark className="mt-0.5" /> : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-micro text-foreground-faint">
                      {doc.kind} · {doc.version}
                      <StatusText status={doc.status}>{doc.statusLabel}</StatusText>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* עמית's findings for this context */}
      {insights.length > 0 ? (
        <div>
          <DockLabel>עמית מצא</DockLabel>
          <ul className="mt-2 flex flex-col gap-2.5">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="rounded-md border-s-2 border-accent bg-gold-100/40 p-3"
              >
                <p className="flex items-start gap-1.5 text-caption leading-relaxed text-foreground">
                  <AIMark className="mt-1" />
                  <span className="min-w-0">{insight.text}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-micro text-foreground-faint">
                    {insight.source}
                  </span>
                  <ConfidenceBar value={insight.confidence} />
                </div>
                <button
                  type="button"
                  className="mt-1.5 rounded-xs text-micro font-semibold text-gold-700 transition-colors hover:text-gold-600"
                  style={{ transitionDuration: "var(--motion-quick)" }}
                >
                  {insight.action} ←
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* the operational facts */}
      <dl className="flex flex-col gap-2 border-t border-line/60 pt-4">
        <div className="flex items-center gap-2 text-caption">
          <CalendarGlyph size={13} className="shrink-0 text-foreground-faint" />
          <dt className="text-foreground-faint">מועד קרוב:</dt>
          <dd className="truncate font-medium text-foreground">{matter.nextEvent}</dd>
        </div>
        {matter.missingDocs > 0 ? (
          <div className="flex items-center gap-2 text-caption">
            <DocumentGlyph size={13} className="shrink-0 text-foreground-faint" />
            <dt className="text-foreground-faint">חסר:</dt>
            <dd>
              <StatusText status="today">{matter.missingDocs} מסמכים</StatusText>
            </dd>
          </div>
        ) : null}
        {matter.waitingOn ? (
          <div className="flex items-center gap-2 text-caption">
            <HourglassGlyph size={13} className="shrink-0 text-foreground-faint" />
            <dt className="text-foreground-faint">ממתין:</dt>
            <dd className="truncate">
              <StatusText status={matter.waitingStatus}>
                {matter.waitingOn}
              </StatusText>
            </dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-caption">
          <dt className="text-foreground-faint">צוות:</dt>
          <dd className="flex items-center gap-1.5">
            <span aria-hidden className="flex -space-x-1.5">
              {matter.team.map((member) => (
                <span
                  key={member}
                  className="flex h-6 w-6 items-center justify-center rounded-pill bg-ink-900 text-micro text-paper-0 ring-2 ring-surface-raised"
                >
                  {member.slice(0, 1)}
                </span>
              ))}
            </span>
            <span className="text-foreground-soft">{matter.team.join(", ")}</span>
          </dd>
        </div>
      </dl>

      {/* meeting preparation — only when the context has one today */}
      {meeting ? (
        <div className="surface-paper rounded-md p-3.5">
          <p className="flex items-center gap-2 text-caption font-semibold text-foreground">
            <PhoneGlyph size={13} className="text-foreground-faint" />
            {meeting.title} · {meeting.with}
            <span className="ms-auto text-micro font-medium tabular-nums text-foreground-soft">
              {meeting.time}
            </span>
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-micro leading-relaxed text-foreground-soft">
            <AIMark className="mt-0.5" />
            {meeting.aiPrep}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <MicroProgress value={meeting.prep} label="מוכנות לפגישה" />
            <button
              type="button"
              className="rounded-xs text-micro font-semibold text-gold-700 transition-colors hover:text-gold-600"
              style={{ transitionDuration: "var(--motion-quick)" }}
            >
              {meeting.action} ←
            </button>
          </div>
        </div>
      ) : null}

      {/* one suggested action */}
      <Link
        href="/matters"
        className="inline-flex h-10 items-center justify-center rounded-md bg-ink-900 px-5 text-small font-medium text-paper-0 shadow-raised transition-all hover:-translate-y-px hover:bg-ink-800 hover:shadow-lift"
        style={{ transitionDuration: "var(--motion-quick)" }}
      >
        {matter.action}
      </Link>
    </aside>
  );
}
