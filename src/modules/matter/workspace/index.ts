/**
 * Matter Workspace (Capability 2, Slice 2.0.0) — public surface.
 * Pure presenter + view-model types + the authorized server loader. React
 * components live under `./components` and are imported directly by the route.
 */
export type {
  MatterWorkspaceView, WorkspaceInput, Tone,
  WorkspaceHero, WorkspaceTimeline, WorkspaceFacts, WorkspaceParticipants,
  WorkspaceDocuments, WorkspaceEvidence, WorkspaceDeadlines,
} from "./types.ts";
export { buildWorkspaceView, DOCUMENTS_SHOWN } from "./present.ts";
export { loadMatterWorkspace, type WorkspaceLoad } from "./loader.ts";
