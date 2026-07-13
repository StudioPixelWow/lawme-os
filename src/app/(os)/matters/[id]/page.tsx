import type { Metadata } from "next";
import { Workspace } from "@/design-system/patterns/workspace";
import { buildMatterProfile } from "@/modules/matter";
import { getDemoMatter } from "@/modules/matter/fixtures/demo";
import { toRoomViewModel } from "@/modules/matter/view/adapter";
import { MatterRoom } from "@/modules/matter/view/room";

/**
 * The Matter App — one matter, run from a room (Sprint 1: the structural
 * skeleton). The profile is computed server-side from the matter intelligence
 * engines; only the presentation-ready view-model reaches the client.
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
  const profile = buildMatterProfile(matter);
  const vm = toRoomViewModel(profile, matter);

  return (
    <Workspace width="wide">
      <MatterRoom vm={vm} />
    </Workspace>
  );
}
