import { redirect } from 'next/navigation';
import { portalHref } from '@/lib/portal-path';

/**
 * redirect(), to a portal page.
 *
 * Portal code names its pages the way the app files them, /portal/invoices,
 * and so do the paths it keeps and checks (a sign-in link's landing page, the
 * `next` it returns to). The browser is on the portal's own host, where that
 * page is /invoices, so the address is written that way as it leaves. Sending
 * the long form would work too, since the proxy shortens it, at the cost of a
 * second trip.
 */
export function toPortal(path: string): never {
  redirect(portalHref(path));
}
