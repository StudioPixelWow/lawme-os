/**
 * /dev/matter-workspace — development-only preview of the Matter Workspace
 * (Capability 2, Slice 2.0.0). Renders the real workspace components from a
 * deterministic fixture — NO auth, NO database — so the calm read-only screen
 * can be reviewed and screenshotted in isolation. Not linked from navigation;
 * gated out of production builds (LAWME_DEV_TOOLS=1 escape hatch aside).
 *
 * `?state=empty` renders the brand-new-matter state (proves "empty never looks
 * broken"). The production route is src/app/(os)/matters/[id], which renders the
 * SAME components inside the app shell from authorized live data.
 */
import { notFound } from "next/navigation";
import { Workspace } from "@/design-system/patterns/workspace";
import { MatterWorkspace } from "@/modules/matter/workspace/components/matter-workspace";
import { buildWorkspaceView } from "@/modules/matter/workspace";
import { workspaceFixtureView, workspaceEmptyFixtureInput } from "@/modules/matter/workspace/fixtures";
import { isDevInterfaceEnabled } from "../legal-intelligence/gate";

export const dynamic = "force-dynamic";

export default async function MatterWorkspacePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (!isDevInterfaceEnabled(process.env)) notFound();
  const { state } = await searchParams;
  const view = state === "empty" ? buildWorkspaceView(workspaceEmptyFixtureInput()) : workspaceFixtureView();
  return (
    <div className="min-h-screen bg-environment">
      <Workspace width="wide">
        <MatterWorkspace view={view} />
      </Workspace>
    </div>
  );
}
