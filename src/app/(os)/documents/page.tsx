import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";

export const metadata: Metadata = { title: "מסמכים" };

export default function DocumentsPage() {
  return (
    <Workspace>
      <PageHeader
        title="מסמכים"
        context="ספריית המסמכים של המשרד — מגורסאות ועד חתימה."
      />
      <SectionChapter title="הספרייה" index={0}>
        <Placeholder
          headline="עוד אין מסמכים"
          line="כתבי טענות, חוזים ופרוטוקולים יחיו כאן — ודינו ידע לסכם אותם, לאתר בהם מועדים ולהצביע על סעיפים חשובים."
        />
      </SectionChapter>
    </Workspace>
  );
}
