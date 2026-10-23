import { redirect } from 'next/navigation';

/** Receipts are listed with the payments they were given for. */
export default function ReceiptsIndex() {
  redirect('/payments');
}
