import Link from "next/link";

/** 404 — same editorial calm as every other state. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen animate-rise flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-display text-foreground-faint" dir="ltr">
        404
      </p>
      <h1 className="mt-6 font-display text-title text-balance text-foreground">
        הדף הזה לא נמצא
      </h1>
      <p className="mt-4 max-w-reading text-body text-pretty text-foreground-soft">
        ייתכן שהקישור השתנה, או שהדף עוד לא נבנה.
      </p>
      <span aria-hidden className="mt-8 h-px w-12 bg-accent" />
      <Link
        href="/today"
        className="mt-10 inline-flex h-11 items-center rounded-sm bg-ink-900 px-5 text-small font-medium text-paper-0 transition-colors duration-150 hover:bg-ink-800"
      >
        חזרה להיום
      </Link>
    </main>
  );
}
