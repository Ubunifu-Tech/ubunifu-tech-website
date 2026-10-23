import { redirect } from 'next/navigation';

/** Refunds are listed with the payments they came from. */
export default function RefundsIndex() {
  redirect('/payments?show=refunds');
}
