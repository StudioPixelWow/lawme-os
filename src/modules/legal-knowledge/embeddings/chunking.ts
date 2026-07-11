/** Anchor-preserving paragraph-window chunking. */
import type { ExtractedBlock } from "../extraction/types.ts";
import type { Chunk, ChunkingStrategy } from "./types.ts";
import { POC_CHUNKING } from "./types.ts";

export function chunkBlocks(
  blocks: ExtractedBlock[],
  strategy: ChunkingStrategy = POC_CHUNKING,
): Chunk[] {
  const paragraphs = blocks.filter((b) => b.kind === "paragraph" || b.kind === "heading");
  const chunks: Chunk[] = [];
  let window: ExtractedBlock[] = [];
  let windowChars = 0;

  const flush = () => {
    if (window.length === 0) return;
    chunks.push({
      anchorKey: window[0].anchorKey,
      chunkIndex: chunks.length,
      text: window.map((b) => b.text).join("\n"),
      charStart: window[0].charStart,
      charEnd: window[window.length - 1].charEnd,
    });
    // overlap: keep the last N blocks as the start of the next window
    window = strategy.overlapBlocks > 0 ? window.slice(-strategy.overlapBlocks) : [];
    windowChars = window.reduce((s, b) => s + b.text.length, 0);
  };

  for (const block of paragraphs) {
    if (windowChars + block.text.length > strategy.maxChars && window.length > 0) flush();
    window.push(block);
    windowChars += block.text.length;
  }
  if (window.length > 0) {
    chunks.push({
      anchorKey: window[0].anchorKey,
      chunkIndex: chunks.length,
      text: window.map((b) => b.text).join("\n"),
      charStart: window[0].charStart,
      charEnd: window[window.length - 1].charEnd,
    });
  }
  return chunks;
}
