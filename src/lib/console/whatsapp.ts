/**
 * Calling codes for the countries whose local numbers we rewrite. Both write
 * a mobile as ten digits starting with 0 (0712 345 678), and so do Uganda and
 * Rwanda, so a local number is only rewritten when the client's own country
 * says which code it takes.
 */
const CALLING_CODE: Record<string, string> = { TZ: '255', KE: '254' };

/**
 * A number as wa.me wants it: digits only, with the country code. Returns ''
 * whenever the number cannot be read with certainty: a wrong guess would put
 * the private link in a stranger's chat.
 *
 * Accepted: a number written with its country code (+255 712 345 678, or
 * 00255...), and for a client in Tanzania or Kenya, a local number starting
 * with 0 or one already starting with that country's code.
 */
export function whatsappNumber(phone: string | null, country: string): string {
  const written = (phone ?? '').trim();
  const digits = written.replace(/\D/g, '');
  if (!digits) return '';

  const international = written.startsWith('+')
    ? digits
    : digits.startsWith('00')
      ? digits.slice(2)
      : null;
  if (international !== null) {
    // E.164 allows up to 15 digits; anything under 8 is not a whole number.
    return /^[1-9]\d{7,14}$/.test(international) ? international : '';
  }

  const code = CALLING_CODE[country.trim().toUpperCase()];
  if (!code) return '';
  if (/^0[1-9]\d{8}$/.test(digits)) return `${code}${digits.slice(1)}`;
  if (digits.startsWith(code) && digits.length === code.length + 9) return digits;
  return '';
}

/** A wa.me link with the message written, or undefined when the number is uncertain. */
export function whatsappLink(phone: string | null, country: string, message: string) {
  const number = whatsappNumber(phone, country);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : undefined;
}
