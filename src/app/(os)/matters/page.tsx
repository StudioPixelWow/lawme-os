import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";

export const metadata: Metadata = { title: "תיקים" };

export default function MattersPage() {
  return (
    <Workspace>
      <PageHeader
        title="תיקים"
        context="כל תיקי המשרד — חיים, מסודרים, ומספרים את הסיפור של עצמם."
      />
      <SectionChapter title="התיקים הפעילים" index={0}>
        <Placeholder
          headline="עוד אין תיקים"
          line="הרגע המושלם לפתוח את הראשון. כל תיק יהיה עמוד אחד ארוך ומסודר — זהות, ציר זמן, מסמכים וצדדים."
        />
      </SectionChapter>
    </Workspace>
  );
}
