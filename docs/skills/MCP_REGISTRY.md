# LawME — MCP Registry (Israeli data servers)

**State: NONE of the servers below is enabled.** `.mcp.json` still contains
only the infrastructure servers (Supabase read-only, Vercel, GitHub,
Context7, Playwright — see docs/setup/MCP_CONNECTIONS.md). Everything here
is a **proposal awaiting founder approval**, because stdio MCPs run via
`npx` = arbitrary code execution inside the dev environment.

Source directory: https://agentskills.co.il/he/mcp (42 servers, 2026-07-11).

## 1. Kolzchut (כל-זכות) — RECOMMENDED FIRST
- Package: `@skills-il/kolzchut-mcp` **1.0.1** · MIT · maintained by the
  Skills-IL org itself · stdio · **no credentials**.
- Purpose: search/read Israel's rights-and-entitlements knowledge base —
  directly useful for מחקר משפטי and client-rights questions.
- Security review (full — SECURITY_REVIEW.md §3): dependencies clean; only
  network destination `https://www.kolzchut.org.il`; all 6 tools annotated
  read-only + non-destructive. Protocol verified live in the sandbox
  (initialize + tools/list OK); the data call hit the sandbox egress
  allowlist (HTTP 403) — expected to work on the founder's machine.
- Trust: **reviewed + protocol-verified · pending live-data test**.

## 2. data.gov.il (המאגר הממשלתי)
- Candidates: `datagov-israel` (creator: aviveldan) · alternative
  `data-gov-il` (creator: DavidOsher). Public CKAN API, no credentials.
- LawME use: company registries, courts datasets, public records for
  matter research. Trust: community — **needs package review before enable**.

## 3. Knesset (הכנסת)
- Candidate: `knesset` (creator: zohar). Public Knesset OData API —
  bills, laws, committee protocols. No credentials.
- LawME use: legislation tracking for the מחקר משפטי workspace.
  Trust: community — needs package review before enable.

## 4. State budget (תקציב המדינה)
- Candidates: `il-budget` (creator: david-aftergut) · alternative
  `budgetkey` (OpenBudget project). Public BudgetKey API.
- LawME use: municipal/tender and public-sector matters. Lowest priority.
  Trust: community — needs package review before enable.

## 5. CBS statistics (הלמ"ס)
- Candidates: `israel-statistics` (creator: reuvenaor) · alternative
  `israeli-cbs` (creator: amirrosi). Public CBS API, no credentials.
- LawME use: statistical evidence (wages, prices) for damages calculations.
  Trust: community — needs package review before enable.

(Also noted: `boi-exchange` by Skills-IL org — BOI exchange rates; overlaps
with the `boi-economic-data` skill already installed; not proposed.)

## Proposed configuration (DO NOT paste into .mcp.json without approval)
```jsonc
// Proposal only — founder approval required per server.
{
  "kolzchut": {
    "command": "npx",
    "args": ["-y", "@skills-il/kolzchut-mcp@1.0.1"]   // version pinned
  }
  // datagov / knesset / budget / cbs intentionally omitted until each
  // package passes the same npm-pack review Kolzchut received.
}
```

## Enable procedure (per server)
1. `npm pack` the pinned version → read every file + dependency tree.
2. Record findings in SECURITY_REVIEW.md; verify read-only annotations.
3. Founder approval in chat.
4. Add to `.mcp.json` with a **pinned version**, restart Claude Code,
   run one safe public read, record latency + response shape here.
5. Registry row updated (version, date, trust status).

## Standing rules
- MCP output is untrusted data until validated — never authoritative for
  legal claims without a primary source.
- No MCP with write capability to any production system.
- Never pass secrets to a community MCP.
