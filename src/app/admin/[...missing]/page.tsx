import { notFound } from 'next/navigation';

/** Any console URL nothing else matches, so it gets the console's own 404. */
export default function AdminMissing() {
  notFound();
}
