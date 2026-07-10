import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { TodayWorkspace } from "@/modules/today";
import { TodayDate } from "./today-date";

export const metadata: Metadata = { title: "היום" };

/**
 * היום — the V7 central workspace: a desktop-class operating surface,
 * not a page. Today Focus (with the integrated timeline) + Context
 * Dock in the first viewport; the Matter Operations Board beneath;
 * documents as physical objects; finance as one executive strip;
 * דינו contextual everywhere, in depth only in the drawer.
 * Typed mock data only.
 */
export default function TodayPage() {
  return (
    <Workspace width="wide">
      <TodayWorkspace dateLine={<TodayDate />} />
    </Workspace>
  );
}
