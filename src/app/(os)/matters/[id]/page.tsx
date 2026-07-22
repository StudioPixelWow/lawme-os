import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { MatterRoom } from "@/modules/matter/view/room";
import { loadAuthorizedMatterRoom } from "@/modules/matter/view/authorized-matter-loader";
import { getServerAuthClient, tryGetServerActorContext } from "@/modules/identity/server";

// Per-request: a real matter must never be served from a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The Matter App — one matter, run from a room (Capability 2: real matters).
 * The matter is loaded server-side (the frozen demo for slug "demo", otherwise
 * from the Slice A matters table when durable storage is configured) and seeded
 * into the client store, which computes the presentation view-model through the
 * real intelligence engine and recomputes it whenever a workflow mutates it.
 */
/** Resolve the actor + authenticated client, then load the matter ONLY if the
 *  read policy authorizes it. A denial (or absence) returns null — the page
 *  renders the uniform not-found, so an inaccessible matter is indistinguishable
 *  from a non-existent one (no enumeration). */
async function loadAuthorizedRoomOrNull(id: string) {
  const actor = await tryGetServerActorContext();
  if (!actor.ok) return null;
  const db = await getServerAuthClient();
  const result = await loadAuthorizedMatterRoom(db, actor.actor, id, new Date().toISOString());
  return result.ok ? result.matter : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const matter = await loadAuthorizedRoomOrNull(id);
  return { title: matter ? matter.titleHe : "תיק לא נמצא" };
}

export default async function MatterRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matter = await loadAuthorizedRoomOrNull(id);
  if (!matter) notFound();

  return (
    <Workspace width="wide">
      <MatterRoom matter={matter} />
    </Workspace>
  );
}
