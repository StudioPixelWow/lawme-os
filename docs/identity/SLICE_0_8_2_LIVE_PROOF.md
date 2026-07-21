# Slice 0.8.2 — Real Supabase Session Resolution · Live Development Proof

Capability 0.8 (Platform Identity & Authorization) · Slice 0.8.2
Development project: `udispadsbxqicmawqcuk` · Branch: `dev-preview`

This slice connects the canonical, immutable **ActorContext** (built in 0.8.1)
to a **real Supabase Auth session**. The proof is split in two:

1. **Automated read-only preconditions** — run by the build against Development;
   results captured below. No auth users were created (creating them requires
   handling credentials, which is out of bounds for the automated agent).
2. **Manual founder runbook** — the two steps that require a real credential
   (create a test user, sign in) are performed by the founder in the Supabase
   dashboard and the browser. Exact steps are given.

> Security posture reminder (unchanged this slice): the service-role key is never
> used to identify or authorize a user; identity is read only via the verified
> `auth.getUser()` path; no actor/role/capability/membership is ever trusted from
> a browser payload; there is no demo-organization fallback in a protected path.

---

## 1. Automated read-only preconditions (verified against Development)

All queries below are **read-only** and were executed against `udispadsbxqicmawqcuk`.

### 1.1 RLS is enabled on every identity-critical table

| table | `rls_enabled` |
| --- | --- |
| `public.profiles` | `true` |
| `public.organizations` | `true` |
| `public.organization_memberships` | `true` |

The production `ActorIdentityRepository` uses the **authenticated (anon-key,
RLS-enforced) client** — never the service client — so these policies are the
tenant boundary at read time.

### 1.2 The columns the resolver reads exist with the expected types

`organization_memberships`: `id uuid`, `organization_id uuid`, `profile_id uuid`,
`role text`, `status text`.
`profiles`: `id uuid`, `display_name text`.

The repository maps a membership only when **all** of `id / organization_id /
profile_id / role / status` are present strings; anything else fails closed
(mapped to `null`), so a partial row can never yield a half-built actor.

### 1.3 `profiles.id` is the canonical actor id

Foreign key `profiles_id_fkey`: `public.profiles(id)` → `auth.users`.

Therefore the authenticated user's `auth.users.id` **equals** their
`profiles.id`, which is the LawME actor id the ActorContext is built around.
`findProfileByAuthUserId(authUserId)` selects `profiles` by that id directly.

### 1.4 No new advisors introduced

This slice adds **no migration** and no schema change. The security advisor set
is unchanged: the only outstanding item is a pre-existing `INFO`
(`rls_enabled_no_policy`) on the unrelated `public.legal_source_fetches` table.
No `ERROR`/`WARN`, and nothing on any identity table.

---

## 2. Manual founder runbook (credential-bearing steps)

These steps create a **disposable test identity** in **Development only** and
exercise the full protected boundary end to end. Do them once; delete the test
user afterward. Never use a real client's email or a production credential.

### 2.1 Provision a Development env

Ensure the app has these (Development values only) — the anon key is public by
design; the service-role key is **not** used by any auth path and must never be
exposed to the browser:

```
NEXT_PUBLIC_SUPABASE_URL=<https://udispadsbxqicmawqcuk.supabase.co>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon/publishable key>
```

### 2.2 Create a disposable test user (Supabase Dashboard)

1. Supabase → project `udispadsbxqicmawqcuk` → **Authentication → Users → Add user**.
2. Create a user with a throwaway email + password you type yourself
   (e.g. `qa+082@lawme.dev`). Confirm the email so the account is active.
3. Copy the new user's **UUID**.

### 2.3 Attach the profile + an active membership (SQL editor)

A signed-in user with **no active membership** must land on the no-organization
state; a user with an active membership must reach the OS. To test the happy
path, ensure a profile row and an **active** membership exist. Run (Development
SQL editor), substituting the UUID and an existing `organizations.id`:

```sql
-- profile row (id == auth user id)
insert into public.profiles (id, display_name)
values ('<AUTH_USER_UUID>', 'QA 0.8.2')
on conflict (id) do nothing;

-- active membership in an existing organization
insert into public.organization_memberships (organization_id, profile_id, role, status)
values ('<EXISTING_ORG_UUID>', '<AUTH_USER_UUID>', 'lawyer', 'active')
on conflict do nothing;
```

> To test the **no-active-org** branch instead, skip the membership insert (or
> set `status='invited'`) and confirm the app shows the organization-selection /
> no-organization surface rather than the OS.

### 2.4 Exercise the boundary in the browser

Run the app against Development and verify, in order:

1. **Anonymous → login.** Visit `/today` while signed out → redirected to
   `/login?redirect=%2Ftoday`. (The `proxy` refreshes/inspects the session; the
   `(os)` layout is the real gate.)
2. **Bad credentials stay generic.** Enter the test email with a wrong password →
   the form shows only *"פרטי ההתחברות שגויים."* It must **not** reveal whether
   the email exists.
3. **Sign in.** Enter the correct password → full-page navigation → you land on
   `/today` inside the OS. The header shows the safe identity (name · org · role
   label) — display only.
4. **No-active-org path** (if you tested 2.3's alternate): after sign-in you are
   sent to `/select-organization`; picking an org POSTs
   `/api/identity/active-organization`, which re-verifies the membership
   server-side, sets the httpOnly `lawme_active_org` cookie (org id only), and
   returns you to `/today`.
5. **Cross-tenant selection fails closed.** POST
   `/api/identity/active-organization` with an org UUID you are **not** an active
   member of → `403`/`409` safe JSON envelope, no cookie written.
6. **Open-redirect defense.** Visit
   `/login?redirect=https://evil.example` then sign in → you land on `/today`
   (the external URL is rejected), never on the external site.
7. **Logout.** Click *יציאה* (POST `/logout`) → session + `lawme_active_org`
   cookie cleared → back at `/login`. A cross-site `GET /logout` does nothing
   (POST-only).

### 2.5 Clean up

Supabase → **Authentication → Users** → delete the disposable user. Optionally
remove the test profile/membership rows. (Deletion is a founder action; the
automated agent does not delete users or data.)

---

## 3. What is intentionally NOT in this slice

- No public signup, password reset, MFA, SSO, or SCIM.
- No change to Matter RLS; no resource/per-matter authorization.
- No Bootstrap and no `app.bootstrap_matter_v1()`.
- No LLM provider wired.
- No Production touch; no migration applied.
- The Matter **create** route (`POST /api/matters`) and the Matter **room**
  loader still use the Slice-1 demo-tenant path; only the **intake analyze**
  route and the **matter list** loader were migrated to the real ActorContext
  this slice (see the final report's "Deferred, by design" note).
