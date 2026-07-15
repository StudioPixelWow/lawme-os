/**
 * Entrance-reveal helper for the chapter/header patterns.
 *
 * The default entrance choreography (`animate-rise`) starts at opacity:0 with
 * `animation-fill-mode: both`, so the FIRST PAINT is invisible until the fade
 * completes. That is fine for long editorial pages, but misleading where a user
 * must see content immediately (e.g. the Matter list — a faded first paint reads
 * as "no matters"). `reveal={false}` opts a specific section/header out: it
 * renders fully visible on first paint, with no opacity-zero start and therefore
 * no layout shift. Motion is NOT removed globally — every other route keeps the
 * default. Reduced-motion is unaffected (opting out is strictly less motion).
 */
export function riseClass(reveal: boolean): string {
  return reveal ? "animate-rise" : "";
}

/** True when the rendered element would begin hidden (opacity-zero) on first paint. */
export function startsHidden(reveal: boolean): boolean {
  return riseClass(reveal).includes("animate-rise");
}
