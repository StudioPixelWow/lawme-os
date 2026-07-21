import type { Metadata } from "next";
import { safeInternalRedirect } from "@/modules/identity/infrastructure/route-protection";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "התחברות" };

/**
 * Public login page (Capability 0.8, Slice 0.8.2).
 *
 * A neutral entry surface: email + password only. No signup, no "forgot
 * password", no SSO, and no message that could disclose whether an account
 * exists. The `redirect` query is sanitized to a same-origin relative path
 * before it ever reaches the client form (open-redirect defense); the server
 * layout remains the real gate.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const redirectTo = safeInternalRedirect(raw);

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-title font-semibold text-foreground">LawME</h1>
        <p className="mt-1 text-small text-foreground-soft">מערכת ההפעלה המשפטית</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
