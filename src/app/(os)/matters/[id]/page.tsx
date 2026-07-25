import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { MatterWorkspace } from "@/modules/matter/workspace/components/matter-workspace";
import { loadMatterWorkspace, type MatterWorkspaceView } from "@/modules/matter/workspace";
import { getServerAuthClient, tryGetServerActorContext } from "@/modules/identity/server";

// Per-request: a real matter must never be served from a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The Matter Workspace — the first user-facing LawME screen (Capability 2,
 * Slice 2.0.0). One matter, read from a calm room built entirely from persisted
 * Capability-1 data (header, facts, participants, documents, evidence,
 * deadlines, activity). The read is authorized BEFORE any content is loaded:
 * a denial (or absence) returns null and the page renders the uniform
 * not-found, so an inaccessible matter is indistinguishable from a missing one.
 */
async function loadAuthorizedWorkspaceOrNull(id: string): Promise<MatterWorkspaceView | null> {
  const actor = await tryGetServerActorContext();
  if (!actor.ok) return null;
  const db = await getServerAuthClient();
  const result = await loadMatterWorkspace(db, actor.actor, id, new Date().toISOString());
  return result.ok ? result.view : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const view = await loadAuthorizedWorkspaceOrNull(id);
  return { title: view ? view.hero.titleHe : "תיק לא נמצא" };
}

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await loadAuthorizedWorkspaceOrNull(id);
  if (!view) notFound();

  return (
    <Workspace width="wide">
      <MatterWorkspace view={view} />
    </Workspace>
  );
}
