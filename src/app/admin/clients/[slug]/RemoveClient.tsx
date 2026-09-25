'use client';

import React from 'react';
import {
  ConfirmRemoval,
  onRecordLine,
  unpaidLine,
  withdrawnLine,
} from '@/components/console/ConfirmRemoval';
import type { ClientRemovalCounts } from '@/lib/console/removal';
import { removeClient } from '../actions';

/** Removing a client, with what it takes along said in numbers first. */
export function RemoveClient({
  clientId,
  clientName,
  counts,
}: {
  clientId: string;
  clientName: string;
  counts: ClientRemovalCounts;
}) {
  const consequences = [
    counts.projects > 0
      ? counts.projects === 1
        ? 'Their project is removed too.'
        : `Their ${counts.projects} projects are removed too.`
      : null,
    counts.people > 0
      ? `${counts.people === 1 ? '1 person loses' : `${counts.people} people lose`} access to the portal.`
      : null,
    withdrawnLine(counts.waiting),
    unpaidLine(counts.unpaid, counts.unpaidOwed),
    onRecordLine('Their', counts.invoices, counts.signed),
  ].filter((line): line is string => line !== null);

  return (
    <ConfirmRemoval
      name={clientName}
      noun="client"
      action={removeClient}
      hidden={{ clientId }}
      consequences={consequences}
    />
  );
}
