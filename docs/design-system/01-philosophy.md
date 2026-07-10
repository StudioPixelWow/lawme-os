# 01 · Design Philosophy, Visual Principles, Workspace Philosophy

## 1. Design philosophy

**LawME is a place, not a program.** A lawyer does not "use a CRM" for eight hours —
they *inhabit* a workspace. Every design decision optimizes for long, calm habitation:
low visual noise, high information dignity, zero decoration that doesn't earn its place.

Five beliefs the entire system is built on:

1. **Paper, ink, and light.** The interface is made of three materials only: warm paper
   (surfaces), navy ink (content and action), champagne gold (intelligence and significance).
   A material palette this small is what makes a product feel designed rather than themed.

2. **The law is text; treat text as the interface.** Legal work is reading and writing.
   Typography is therefore the primary UI component — not cards, not icons, not color chips.
   When in doubt, solve it typographically before reaching for a box.

3. **Calm is a feature.** Nothing blinks, bounces, counts up, or begs for attention.
   Urgency is expressed through hierarchy and words ("הדיון מחר"), never through red
   badges shouting numbers. The product should lower a lawyer's heart rate, not raise it.

4. **Intelligence is ambient, not a mascot.** AI appears as quiet gold light woven into the
   workspace — a prepared summary, a suggested task — never as a clippy, a floating robot
   head, or a purple sparkle storm.

5. **Timeless over trendy.** No purple-gradient SaaS, no neo-brutalism, no glassmorphism-everywhere.
   We borrow permanence from print and jurisprudence: serif headlines, hairline rules,
   generous margins. In 2030 this will still look right.

## 2. Visual principles

These are binding, testable rules — not moods:

- **Hebrew first.** All design starts in Hebrew. English is the guest, styled to sit politely
  inside Hebrew text — never the reverse.
- **Native RTL.** The start edge is the right edge. There is no "flipped LTR mode" — RTL is
  the physics of the product (see [13-rtl.md](./13-rtl.md)).
- **Light by default.** One theme at launch: warm daylight. Ivory paper `#FBF9F5`, never
  grey `#F5F5F5`, never pure white fields floating on grey.
- **Navy is the black.** Deep navy `#0A1629` is the text color, the primary button, the icon
  ink. Pure `#000` never appears.
- **Gold is precious.** Champagne gold marks exactly two things: AI presence and moments of
  significance (active chapter, focus, a key figure). **One gold element per view region.**
  If gold appears twice in a glance, remove one.
- **Glass is selective.** Only floating, ephemeral layers are glass: command bar, AI panel,
  sticky context headers, overlay scrims. Content is always solid paper (see 05).
- **Huge whitespace.** Section rhythm starts at 96px. If a screen feels empty, it is correct;
  if it feels comfortable, add space.
- **Editorial layout.** Pages are composed like a beautifully set magazine feature: a strong
  serif opening, a readable measure, chapters divided by space (not boxes), asymmetry allowed.
- **Long scrolling workspaces.** Depth is vertical. We scroll through a story; we do not
  chop it into tabs and widget grids.
- **No dashboard feeling. No admin template. No crowded cards. No purple. No enterprise ugliness.**
  These are hard bans, enforced in review and (where possible) in lint — the default Tailwind
  palette is disabled so `purple-500` does not even compile.

## 3. Workspace philosophy

The organizing metaphor is **a narrated day and living dossiers**:

- The home surface is a **morning brief** — a long, editorial page a brilliant clerk prepared:
  what needs you, what's coming, what moved. It is read top-to-bottom, not scanned like a cockpit.
- An entity (a matter, a client) is a **story on one long page** — identity, summary, timeline,
  materials — with a slim chapter navigation. Never a tab-set, never a detail-panel maze.
- **Lists are indexes** in the editorial sense: scannable, typographic, one line of intelligence
  per row — not data grids by default.
- **The workspace breathes at reading pace.** Content streams in progressively and settles;
  the user is never dropped into a wall of twelve widgets fighting for primacy.
- **Chrome is minimal and constant.** One slim top rail, one command surface (⌘K), one AI
  companion edge. Everything else is content. The measure of success: a screenshot of any
  LawME screen should look closer to a well-set page of a legal journal than to a control panel.
