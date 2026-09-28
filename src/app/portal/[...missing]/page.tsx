import { notFound } from 'next/navigation';

/** Any portal URL nothing else matches, so it gets the portal's own 404. */
export default function PortalMissing() {
  notFound();
}
