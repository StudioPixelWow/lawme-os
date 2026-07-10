import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { PageHeader } from "@/design-system/patterns/page-header";
import { SectionChapter } from "@/design-system/patterns/section-chapter";
import { Placeholder } from "@/design-system/patterns/placeholder";
import { TodayDate } from "./today-date";

export const metadata: Metadata = { title: "היום" };

/** היום — the morning brief. Sprint 0: the editorial skeleton, ready for life. */
export default function TodayPage() {
  return (
    <Workspace>
      <PageHeader title="בוקר טוב" context={<TodayDate />} />

      <SectionChapter title="דורש את תשומת לבך" index={0}>
        <Placeholder
          headline="כאן יופיע מה שחשוב באמת"
          line="עמית ימיין עבורך את המועדים, הדיונים והמשימות שדורשים החלטה — לפי דחיפות אמיתית, לא לפי רעש."
        />
      </SectionChapter>

      <SectionChapter title="הדיונים הקרובים" index={1}>
        <Placeholder
          headline="השבוע שלך בבתי המשפט"
          line="דיונים, מועדים והתייצבויות — עם סטטוס היערכות לכל אחד."
        />
      </SectionChapter>

      <SectionChapter title="תנועה בתיקים" index={2}>
        <Placeholder
          headline="מה קרה מאז אתמול"
          line="מסמכים שהתקבלו, החלטות שנחתמו, משימות שהושלמו — סיפור קצר על כל תיק שזז."
        />
      </SectionChapter>

      <SectionChapter title="הטיוטות של עמית" index={3}>
        <Placeholder
          ai
          headline="עמית יכין, אתם תחליטו"
          line="סיכומים, טיוטות ורישומי זמן שעמית הכין וממתינים לאישור שלך."
        />
      </SectionChapter>
    </Workspace>
  );
}
