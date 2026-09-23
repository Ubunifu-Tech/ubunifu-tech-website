import 'server-only';
import { FEES_TOKEN } from './fees';
import { diffBlocks, splitParagraphs } from './diff';

/**
 * Turning a client's suggested wording back into something staff can edit.
 *
 * The client edits the version they were sent, and that version has the fee
 * schedule written into it: the table, the totals, "## Fees" when we added the
 * heading. Taken as it stands, their text would carry a frozen copy of that
 * schedule into the next version, and sending it would add a second one
 * underneath, because fees are always filled in from the project on send.
 *
 * So the schedule is found (it is exactly what filling in the fees added to
 * the author's text), and wherever it sits in the client's wording it goes
 * back to the {{fees}} placeholder. Everything else they wrote is kept as they
 * wrote it.
 */

type SentVersion = { bodyMarkdown: string; sourceMarkdown: string | null };

/** The letters of a block, so "Total: 1,000" and "Total: 800" read as the same line edited. */
function shape(block: string): string {
  return block.replace(/[^\p{L}]+/gu, '').toLowerCase();
}

function isTable(block: string): boolean {
  const [first, second] = block.split('\n');
  return Boolean(first?.includes('|') && second && /^\s*\|?\s*:?-{2,}/.test(second));
}

export function sourceFromSuggestion(
  sent: SentVersion,
  suggested: string,
): { source: string; feesChanged: boolean } {
  const sentBlocks = splitParagraphs(sent.bodyMarkdown);

  // What filling in the fees added. A version sent without fees has no source
  // of its own, and then there is nothing to put back.
  const schedule = new Set<number>();
  if (sent.sourceMarkdown !== null) {
    for (const part of diffBlocks(splitParagraphs(sent.sourceMarkdown), sentBlocks)) {
      if (part.op === 'added' && part.after !== null) schedule.add(part.after);
    }
  }
  if (schedule.size === 0) return { source: suggested.trim(), feesChanged: false };

  const scheduleShapes = new Set([...schedule].map((index) => shape(sentBlocks[index]!)));
  const parts = diffBlocks(sentBlocks, splitParagraphs(suggested));

  // A change is a run of removed and added blocks between unchanged ones. When
  // the run takes out part of the schedule, what it puts in is their edit of
  // the schedule, not new wording, as long as it looks like the schedule did.
  const touchesSchedule: boolean[] = new Array(parts.length).fill(false);
  for (let start = 0; start < parts.length; ) {
    if (parts[start]!.op === 'same') {
      start += 1;
      continue;
    }
    let end = start;
    while (end < parts.length && parts[end]!.op !== 'same') end += 1;
    const hit = parts
      .slice(start, end)
      .some((part) => part.op === 'removed' && part.before !== null && schedule.has(part.before));
    for (let index = start; index < end; index += 1) touchesSchedule[index] = hit;
    start = end;
  }

  const out: string[] = [];
  let placed = false;
  let feesChanged = false;
  const place = () => {
    if (placed) return;
    out.push(FEES_TOKEN);
    placed = true;
  };

  parts.forEach((part, index) => {
    const fromSchedule = part.before !== null && schedule.has(part.before);
    if (part.op === 'same') {
      if (fromSchedule) place();
      else out.push(part.text);
      return;
    }
    if (part.op === 'removed') {
      if (fromSchedule) {
        feesChanged = true;
        place();
      }
      return;
    }
    // Added.
    if (touchesSchedule[index] && (isTable(part.text) || scheduleShapes.has(shape(part.text)))) {
      feesChanged = true;
      return;
    }
    out.push(part.text);
  });

  return { source: out.join('\n\n').trim(), feesChanged };
}
