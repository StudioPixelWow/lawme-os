import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { getDemoMatter } from "@/modules/matter/fixtures/demo";
import { MatterRoom } from "@/modules/matter/view/room";

/**
 * The Matter App — one matter, run from a room (Sprint 2: the live room).
 * The source matter is loaded server-side and seeded into the client store,
 * which computes the presentation view-model through the real intelligence
 * engine and recomputes it whenever a workflow mutates the matter.
 * Demo data until the datastore lands.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: getDemoMatter(id).titleHe };
}

export default async function MatterRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matter = getDemoMatter(id);

  return (
    <Workspace width="wide">
      <MatterRoom matter={matter} />
    </Workspace>
  );
}
