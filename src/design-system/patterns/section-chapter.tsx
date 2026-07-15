import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/design-system/utils/cx";
import { riseClass } from "./reveal";

/**
 * A chapter of a long-scrolling page — separated by space, not boxes.
 * `index` staggers the entrance choreography (one choreography per view).
 * `reveal={false}` renders the chapter visible on first paint (no opacity-zero
 * entrance) — used where a faded first paint would misleadingly hide content.
 */
export function SectionChapter({
  title,
  children,
  index = 0,
  reveal = true,
}: {
  title: string;
  children: ReactNode;
  index?: number;
  reveal?: boolean;
}) {
  return (
    <section
      className={cx("mt-section", riseClass(reveal))}
      style={reveal ? ({ animationDelay: `${80 + index * 70}ms` } as CSSProperties) : undefined}
    >
      <h2 className="text-title font-semibold tracking-tight text-balance text-foreground">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}
