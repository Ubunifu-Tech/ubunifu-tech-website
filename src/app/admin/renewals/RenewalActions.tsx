'use client';

import { useActionState } from 'react';
import {
  MenuItem,
  MenuLink,
  MenuList,
  MenuNote,
  RowMenu,
  useLastSaid,
} from '@/components/console/RowMenu';
import { bringBackRenewal, skipRenewal, type RenewalState } from './actions';

const INITIAL: RenewalState = { status: 'idle' };

/** What can be done with one period: invoice it, skip it, or undo a skip. */
export function RenewalActions({
  renewalId,
  label,
  status,
  invoiceHref,
  billable,
}: {
  renewalId: string;
  /** Read to screen readers, like "Hosting, Sept 2027 to Sept 2028". */
  label: string;
  status: string;
  /** Where the period is invoiced from. */
  invoiceHref: string;
  /** Close enough to invoice now; a later period can only be skipped. */
  billable: boolean;
}) {
  const [skipState, skip, skipping] = useActionState(skipRenewal, INITIAL);
  const [backState, back, bringing] = useActionState(bringBackRenewal, INITIAL);
  const said = useLastSaid(skipState, backState);

  return (
    <RowMenu label={`Actions for ${label}`}>
      <MenuList>
        {status === 'pending' && (
          <>
            {billable && <MenuLink href={invoiceHref}>Invoice it</MenuLink>}
            <form action={skip}>
              <input type="hidden" name="renewalId" value={renewalId} />
              <MenuItem type="submit" disabled={skipping}>
                {skipping ? 'Skipping…' : 'Skip this period'}
              </MenuItem>
            </form>
          </>
        )}
        {status === 'skipped' && (
          <form action={back}>
            <input type="hidden" name="renewalId" value={renewalId} />
            <MenuItem type="submit" disabled={bringing}>
              {bringing ? 'Bringing back…' : 'Bring it back'}
            </MenuItem>
          </form>
        )}
      </MenuList>
      {said?.message && (
        <MenuNote tone={said.status === 'error' ? 'bad' : 'quiet'}>{said.message}</MenuNote>
      )}
    </RowMenu>
  );
}
