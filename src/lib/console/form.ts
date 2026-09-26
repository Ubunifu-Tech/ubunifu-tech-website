/**
 * Reading text out of a submitted form.
 *
 * Browsers rewrite every newline in a submitted field to CRLF — it is in the
 * HTML specification, and it applies to the hidden input the rich-text editor
 * posts its markdown through as well as to every textarea. So a contract, a
 * post, a ticket reply or a note typed on one line per paragraph arrives with
 * \r\n between them, and was being stored that way.
 *
 * Nothing rendered differently — the markdown renderer already normalises
 * before it splits lines, which is why contract hashes never moved — but the
 * stored text no longer matched what the editor produced. Opening a post and
 * pressing Save with no changes rewrote its body; the parity check reported
 * drift nobody made; and every length check (a note of at least ten
 * characters, a body of at least two hundred) counted each line break twice.
 *
 * Stored text is LF, always, from here.
 */

function read(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').replace(/\r\n?/g, '\n');
}

/** A field as typed, trimmed. Use for everything, single- or multi-line. */
export function formText(formData: FormData, key: string): string {
  return read(formData, key).trim();
}

/**
 * The same, UNTRIMMED. Only for a body whose exact leading and trailing
 * content is deliberate — a document version, which has always been stored
 * exactly as the editor produced it.
 */
export function formTextExact(formData: FormData, key: string): string {
  return read(formData, key);
}

/**
 * A web address typed into a form, as the browser would read it, or null
 * when it is not a full http(s) address. The cleaned form is what gets
 * stored, so it can go into a link without carrying anything else along.
 */
export function webAddress(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Whether a submitted value is one of the allowed choices. */
export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}
