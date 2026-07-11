/** Israeli case-number normalization — public API (Epic 1 POC). */
export type { CaseNumberFormat, ParsedCaseNumber, ProcedureInfo } from "./types.ts";
export { PROCEDURE_CODES, CODE_ALIASES } from "./formats.ts";
export { parseCaseNumber, preprocess, expandYear } from "./parse.ts";
export { normalizeCaseNumber, toDisplay, toSearchKey } from "./normalize.ts";
export type { NormalizedCaseNumber } from "./normalize.ts";
export { validateCaseNumber, sameProceeding } from "./validate.ts";
export type { CaseNumberValidation } from "./validate.ts";
