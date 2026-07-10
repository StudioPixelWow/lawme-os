# src/design-system — Shayish (שיש)

The LawME design system implementation. Full documentation: [`docs/design-system/`](../../docs/design-system/README.md).

```
design-system/
├── tokens/       ✅ the constitution — Tailwind v4 @theme CSS (the ONLY place raw values live)
├── primitives/   ⏳ Button, Input, Surface, Text… (next phase — see docs 09)
├── patterns/     ⏳ Timeline, EntityHeader, AIBlock, EmptyState… (after primitives)
├── motion/       ⏳ shared Motion variants + <Reveal>/<PresenceGroup> (see docs 06)
└── icons/        ⏳ RTL-aware <Icon> wrapper + custom glyphs (see docs 07)
```

## Layer rules (binding)

1. `tokens/` → `primitives/` → `patterns/` → feature modules. Imports flow one way only.
2. This directory knows nothing about law: no matter/client/document concepts here.
3. No hex colors, no `left`/`right`, no raw durations outside `tokens/`.
4. Every primitive ships RTL-native, keyboard-complete, and reduced-motion-aware — or it doesn't ship.
