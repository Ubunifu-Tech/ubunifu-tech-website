'use client';

import React, { useState } from 'react';
import {
  ConfirmRemoval,
  onRecordLine,
  unpaidLine,
  withdrawnLine,
} from '@/components/console/ConfirmRemoval';
import type { RemovalCounts } from '@/lib/console/removal';
import { describeProjectRemoval, removeProject } from './remove-actions';

/**
 * Removing a project. Needs only its id and name, so it can sit anywhere on
 * the project page; what the project holds is looked up on the first press.
 */
export function RemoveProject({ projectId, projectName }: { projectId: string; projectName: string }) {
  // Undefined until looked up; null when the lookup gave nothing back, in
  // which case the lines are said without numbers.
  const [counts, setCounts] = useState<RemovalCounts | null | undefined>(undefined);

  const lookUp = () => {
    setCounts(undefined);
    describeProjectRemoval(projectId).then(setCounts, () => setCounts(null));
  };

  const consequences =
    counts === undefined
      ? null
      : [
          'It comes off the board and out of the client’s portal.',
          counts
            ? withdrawnLine(counts.waiting)
            : 'Anything waiting for a signature is withdrawn.',
          counts ? unpaidLine(counts.unpaid, counts.unpaidOwed) : null,
          counts
            ? onRecordLine('Its', counts.invoices, counts.signed)
            : 'Its invoices and signed documents stay on record. You can bring the project back from its client’s page.',
        ].filter((line): line is string => line !== null);

  return (
    <ConfirmRemoval
      name={projectName}
      noun="project"
      action={removeProject}
      hidden={{ projectId }}
      consequences={consequences}
      onOpen={lookUp}
    />
  );
}
