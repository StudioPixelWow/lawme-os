"use client";

/**
 * Login form (Capability 0.8, Slice 0.8.2) — CLIENT.
 *
 * Password sign-in against Supabase Auth via the BROWSER client (anon key only).
 * Security posture:
 *  - It NEVER reveals whether an email exists: every failure shows one generic
 *    Hebrew message. We do not branch on Supabase's error string.
 *  - No signup / no password reset / no SSO here (out of slice scope).
 *  - The post-login destination is sanitized to a same-origin relative path to
 *    prevent open-redirect; the real gate is the server layout, not this nav.
 *  - On success we do a full-document navigation so the server boundary + fresh
 *    session cookies drive the next render (not client state).
 */
import { useState } from "react";
import { createBrowserAuthClient } from "@/modules/identity/infrastructure/supabase-browser-auth-client";
import { safeInternalRedirect } from "@/modules/identity/infrastructure/route-protection";
import { Button } from "@/design-system/primitives/button";

const GENERIC_ERROR = "פרטי ההתחברות שגויים.";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const supabase = createBrowserAuthClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        // Deliberately generic — never disclose whether the email exists.
        setError(GENERIC_ERROR);
        setPending(false);
        return;
      }
      // Full navigation → server layout re-resolves ActorContext with fresh cookies.
      const target = safeInternalRedirect(redirectTo);
      window.location.assign(target);
    } catch {
      setError(GENERIC_ERROR);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-small">
        <span className="font-medium text-foreground">דוא״ל</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-sm bg-surface-raised px-3 text-body shadow-hairline outline-none focus:shadow-float"
          dir="ltr"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-small">
        <span className="font-medium text-foreground">סיסמה</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-sm bg-surface-raised px-3 text-body shadow-hairline outline-none focus:shadow-float"
          dir="ltr"
        />
      </label>
      {error ? (
        <p role="alert" className="text-small text-critical">
          {error}
        </p>
      ) : null}
      <Button type="submit" intent="primary" disabled={pending} className="mt-2">
        {pending ? "מתחבר…" : "התחברות"}
      </Button>
    </form>
  );
}
