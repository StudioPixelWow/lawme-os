import { UsersGlyph, UserGlyph, BuildingGlyph } from "@/design-system/icons/glyphs";
import { IconContainer } from "@/design-system/primitives/icon-container";
import type { WorkspaceParticipants, ParticipantView } from "../types";
import { WorkspaceSection, EmptyNote } from "./section";

function ParticipantRow({ p }: { p: ParticipantView }) {
  const isCompany = p.kind === "company";
  return (
    <li className="flex items-center gap-3 py-2.5">
      <IconContainer variant={isCompany ? "court" : "client"} size="md">
        {isCompany ? <BuildingGlyph size={16} /> : <UserGlyph size={16} />}
      </IconContainer>
      <div className="min-w-0 flex-1">
        <div className="truncate text-small font-medium text-foreground">{p.nameHe}</div>
        <div className="truncate text-caption text-foreground-faint">
          {p.idNumberHe ?? (isCompany ? "חברה" : "אדם פרטי")}
        </div>
      </div>
    </li>
  );
}

export function ParticipantsSection({ participants }: { participants: WorkspaceParticipants }) {
  const meta = participants.total > 0 ? `${participants.total} גורמים` : undefined;
  return (
    <WorkspaceSection title="גורמים מעורבים" icon={<UsersGlyph size={16} />} iconVariant="team" meta={meta}>
      {participants.total === 0 ? (
        <EmptyNote line="טרם הוזנו גורמים מעורבים בתיק." />
      ) : (
        <div className="space-y-4">
          {participants.groups.map((group) => (
            <div key={group.role}>
              <div className="mb-1 text-caption font-semibold text-foreground-soft">{group.roleLabelHe}</div>
              <ul className="divide-y divide-line/70">
                {group.participants.map((p) => (
                  <ParticipantRow key={p.id} p={p} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
