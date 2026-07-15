import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { MatterRoom } from "@/modules/matter/view/room";
import { loadMatterForRoom } from "@/modules/matter/view/matter-loader";

/**
 * The Matter App — one matter, run from a room (Capability 2: real matters).
 * The matter is loaded server-side (the frozen demo for slug "demo", otherwise
 * from the Slice A matters table when durable storage is configured) and seeded
 * into the client store, which computes the presentation view-model through the
 * real intelligence engine and recomputes it whenever a workflow mutates it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const matter = await loadMatterForRoom(id, new Date().toISOString());
  return { title: matter ? matter.titleHe : "תיק לא נמצא" };
}

export default async function MatterRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matter = await loadMatterForRoom(id, new Date().toISOString());
  if (!matter) notFound();

  return (
    <Workspace width="wide">
      <MatterRoom matter={matter} />
    </Workspace>
  );
}
