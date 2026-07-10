import type { CSSProperties, ReactNode } from "react";

/**
 * A chapter of a long-scrolling page — separated by space, not boxes.
 * `index` staggers the entrance choreography (one choreography per view).
 */
export function SectionChapter({
  title,
  children,
  index = 0,
}: {
  title: string;
  children: ReactNode;
  index?: number;
}) {
  return (
    <section
      className="mt-section animate-rise"
      style={{ animationDelay: `${80 + index * 70}ms` } as CSSProperties}
    >
      <h2 className="text-title font-semibold tracking-tight text-balance text-foreground">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}
