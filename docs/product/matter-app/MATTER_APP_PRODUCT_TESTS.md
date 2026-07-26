# Matter App — Product Acceptance Tests (Epic 5.1)

Measurable tests the Matter App must pass before it is considered done. Run on real
fixtures (the pregnancy-dismissal blocked matter, a healthy matter, a degraded
matter). Human evaluators + automated checks where possible.

## 1. Five-second test

Show the screen for five seconds, then hide it. The reviewer must correctly identify:
matter · current stage · posture · nearest deadline · top blocker · next action ·
review requirement.

- **Pass criteria:** ≥ 6 of 7 correct across ≥ 8 reviewers on the blocked matter; the
  posture and the next action correct 100% of the time (these are non-negotiable).
- **Fail triggers a hierarchy fix**, not a color tweak.

## 2. Thirty-second test

With the screen visible for 30 seconds, the reviewer must explain: why the matter has
its posture · what is missing · who owns the next action · what needs attention today ·
where to drill down for more.

- **Pass criteria:** all five explained correctly by ≥ 80% of reviewers; every "why"
  answer traceable to a visible sourced element (the reviewer can point to it).

## 3. Ten-minute test

In ten minutes of active use the reviewer can: inspect evidence · review documents ·
understand the procedure (where it's been/is/next) · inspect legal coverage · assign
an action · prepare a client update · invoke דינו safely (and see it fail-closed on an
uncovered question).

- **Pass criteria:** all seven completed without help, keyboard-only path works
  end-to-end, and no Class-2/3 action executes without an explicit approval step.

## 4. Automated / deterministic checks (from the data layer)

These reuse the existing benchmark guarantees (Epic 4.2) and add UI-layer assertions:

- **No false-healthy:** a degraded matter never renders `on_track`/green (asserted by
  `matter:benchmark`; the UI must reflect `posture` verbatim).
- **100% sentence traceability:** every narrative sentence in the UI links to its
  `sentenceEvidenceMap` evidence.
- **0 unsupported statements / 0 allegations-as-fact / 0 outcome probabilities** shown.
- **100% blocking-deadline surfaced:** an overdue/imminent strict deadline always
  appears in the core/spine.
- **100% specialist routing shown** when legal coverage is insufficient.
- **Two-accent law:** any viewport shows ≤ gold + one semantic color (automated
  screenshot lint against the palette).
- **One hero law:** exactly one hero object per viewport.
- **Zero horizontal overflow** at 390/1024/1280/1440 (release gate).

## 5. Accessibility gates (IS 5568 / WCAG 2.0 AA)

- Keyboard-only completion of the ten-minute test.
- Screen-reader announces the decision core first and a Hebrew sentence per
  intelligence surface.
- Grayscale blur test: hierarchy still readable with no color.
- Reduced-motion: no state depends on motion.

## 6. The "not-generic" test (blur test)

Blur all text. The screen must still be recognizable as **LawME** (navy rail, gold
meridian, paper) **and** as the **Matter App** (the milestone spine + state-chip
headline). If it could be any dashboard, it fails.

## Definition of done

The Matter App ships when tests 1–6 pass on all three fixtures at all four widths,
every surface binds to a real `MatterProfile` field, and none of the Bible's 52
forbidden rules is violated.
