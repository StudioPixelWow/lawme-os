import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";

export const metadata: Metadata = { title: "לקוחות" };

export default function ClientsPage() {
  return (
    <Workspace>
      <PageHeader
        title="לקוחות"
        context="אנשים וחברות — וכל מערכת היחסים של המשרד איתם."
      />
      <SectionChapter title="ספר הלקוחות" index={0}>
        <Placeholder
          headline="עוד אין לקוחות"
          line="כאן יחיו האנשים והחברות שהמשרד מלווה — כולל בדיקת ניגוד עניינים עוד לפני פתיחת תיק."
        />
      </SectionChapter>
    </Workspace>
  );
}
