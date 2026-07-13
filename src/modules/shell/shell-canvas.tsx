"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/design-system/utils/cx";
import { UtilityRail } from "./utility-rail";
import { suppressesUtilityRail } from "./matter-route";

/**
 * The canvas + utility rail, route-scoped.
 * On a single matter route the Utility Rail is suppressed and the canvas reclaims
 * its end-side space for the Matter Room; everywhere else the rail renders and the
 * canvas reserves room for it (xl+). Mobile is unaffected (the rail is xl-only).
 */
export function ShellCanvas({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const suppress = suppressesUtilityRail(pathname);
  return (
    <>
      {suppress ? null : <UtilityRail />}
      <div className={cx("pt-20 md:ps-20 lg:ps-64", !suppress && "xl:pe-72")}>
        <main id="main" className="pb-28 md:pb-8">
          {children}
        </main>
      </div>
    </>
  );
}
