# Source Exclusions (Epic 3B)

Never ingested in Epic 3B:
- Any commercial legal database (Nevo, Takdin, Pador, Dinim, etc.) — licensed.
- Editorial content (Nevo annotations, Kol Zchut article prose) — copyrighted.
- Case law at scale — no mass judgment crawling in this phase.
- Any source requiring login, payment, CAPTCHA, or WAF bypass.
- Any gov.il/Knesset endpoint fetched by bypassing anti-bot controls.
- Undocumented private APIs unless clearly public, stable and appropriate.
- Real client data of any kind.
- Non-employment domains (ingested corpus stays employment-law only).
- Any source whose permission is `permission_required` or `rejected`
  for full text — those may appear only as metadata/pointer.
