import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";

export const metadata: Metadata = { title: "יומן" };

export default function CalendarPage() {
  return (
    <Workspace>
      <PageHeader
        title="יומן"
        context="דיונים, מועדים ופגישות — עם ההבחנה החשובה בין מועד בית משפט לתזכורת פנימית."
      />
      <SectionChapter title="השבוע" index={0}>
        <Placeholder
          headline="השבוע עוד ריק"
          line="דיונים ומועדים יופיעו כאן ברצועת שבוע רגועה, מימין לשמאל, עם תאריך עברי לצד הלועזי."
        />
      </SectionChapter>
    </Workspace>
  );
}
