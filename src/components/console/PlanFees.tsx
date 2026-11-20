'use client';

import { useState } from 'react';
import { BILLING } from '@/lib/console/fee-labels';
import { moneyInput } from '@/lib/console/money';
import type { PlanFee } from '@/lib/console/plan-fees';
import type { BillingKind } from '@/generated/prisma/client';
import forms from '@/styles/forms.module.css';
import table from '@/styles/table.module.css';
import styles from './PlanFees.module.css';

/**
 * The chosen plan's fees, ticked, with a price beside each, on the form that
 * creates the project. Untick what this deal does not have and price what it
 * does, instead of finding them on the project afterwards.
 */
export function PlanFees({
  fees,
  currency,
  disabled,
}: {
  fees: PlanFee[];
  currency: string;
  disabled?: boolean;
}) {
  // Both held here, because the form resets its fields when a create is
  // refused, which would quietly tick a dropped fee again and put the plan's
  // price back over the one typed.
  const [left, setLeft] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  if (fees.length === 0) return null;

  return (
    <fieldset className={`${forms.wide} ${styles.fees}`} disabled={disabled}>
      <legend className={forms.label}>Fees from the plan</legend>
      <input type="hidden" name="planFees" value="on" />
      <div className={table.scroll}>
        <table className={`${table.table} ${table.compact}`}>
          <thead>
            <tr>
              <th className={table.th} scope="col">
                <span className={styles.hidden}>Add</span>
              </th>
              <th className={table.th} scope="col">
                Fee
              </th>
              <th className={table.th} scope="col">
                Billed
              </th>
              <th className={`${table.th} ${table.numericHead}`} scope="col">
                Price ({currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => {
              const kept = !left.includes(fee.position);
              return (
                <tr key={fee.position} className={table.tr}>
                  <td className={table.td}>
                    <input
                      type="checkbox"
                      name="fee"
                      value={fee.position}
                      className={forms.check}
                      // Its default follows the choice, so the reset after a
                      // refusal lands on what was chosen, not on ticked.
                      defaultChecked={kept}
                      onChange={(event) => {
                        const keep = event.target.checked;
                        setLeft((current) =>
                          keep ? current.filter((position) => position !== fee.position) : [...current, fee.position],
                        );
                      }}
                      aria-label={`Add ${fee.label}`}
                    />
                  </td>
                  <td className={`${table.td} ${kept ? '' : table.muted}`}>{fee.label}</td>
                  <td className={`${table.td} ${table.muted}`}>{BILLING[fee.billingKind as BillingKind]?.label ?? fee.billingKind}</td>
                  <td className={`${table.td} ${table.numeric}`}>
                    <input
                      name={`feeAmount:${fee.position}`}
                      inputMode="decimal"
                      className={`${forms.control} ${styles.amount}`}
                      value={typed[fee.position] ?? (fee.amountMinor > 0 ? moneyInput(fee.amountMinor, currency) : '')}
                      onChange={(event) => {
                        const next = event.target.value;
                        setTyped((current) => ({ ...current, [fee.position]: next }));
                      }}
                      placeholder="Not priced"
                      disabled={!kept}
                      aria-label={`Price for ${fee.label}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={forms.hint}>Untick what this deal does not include. A fee left unpriced can be priced on the project.</p>
    </fieldset>
  );
}
