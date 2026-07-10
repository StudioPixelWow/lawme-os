"use client";

import { useEffect } from "react";
import { Button } from "@/design-system/primitives/button";
import { Workspace } from "@/design-system/patterns/workspace";

/**
 * Segment error boundary — honest, calm, recoverable.
 * Next 16: the retry handler is `unstable_retry` (replaces `reset`).
 */
export default function OsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Workspace className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-title text-foreground">משהו השתבש</h1>
      <p className="mt-4 max-w-reading text-body text-foreground-soft">
        לא הצלחנו לטעון את העמוד. הנתונים שלך במקומם — אפשר פשוט לנסות שוב.
      </p>
      <Button
        intent="primary"
        onClick={() => unstable_retry()}
        className="mt-10"
      >
        לנסות שוב
      </Button>
      {error.digest ? (
        <p className="mt-8 text-micro text-foreground-faint" dir="ltr">
          {error.digest}
        </p>
      ) : null}
    </Workspace>
  );
}
