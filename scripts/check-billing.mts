/**
 * The billing rules that decide dates on money a client owes.
 *
 * A part payment's balance: on 19 November a deposit against a one-off build
 * fee and a hosting year due the next day made the whole build balance due,
 * and overdue, from that hosting date. The rule now lives in one place,
 * balance-due.ts, shared by the form and the action; these are its cases.
 *
 * Run with: npm run check:billing
 */
const { addDays, balanceDueDay, chosenBalanceDay } = await import('../src/lib/console/balance-due');

const failures: string[] = [];
const expect = (name: string, actual: unknown, wanted: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${name}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
};

const today = '2026-11-19';
const terms = 14;
const onTerms = '2026-12-03';

// ── When the rest of a part payment is due ──────────────────────────────────

expect('days are added on the calendar', addDays(today, terms), onTerms);
expect('across a year', addDays('2026-12-25', 10), '2027-01-04');
expect('across February', addDays('2028-02-27', 2), '2028-02-29');

expect(
  'a one-off build with a hosting year due tomorrow is due on the terms, not the hosting date',
  balanceDueDay({ today, termsDays: terms, feeDays: [null, '2026-11-20'] }),
  onTerms,
);
expect(
  'a one-off build with a hosting year due in March is still due on the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: [null, '2027-03-01'] }),
  onTerms,
);
expect(
  'one-off fees alone are due on the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: [null, null] }),
  onTerms,
);
expect(
  'renewals alone are due by their latest date when it is after the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: ['2027-01-10', '2027-02-01'] }),
  '2027-02-01',
);
expect(
  'renewals alone are never due sooner than the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: ['2026-11-20'] }),
  onTerms,
);
expect(
  'a renewal already past its date is due on the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: ['2026-10-01'] }),
  onTerms,
);
expect(
  'no payment terms means due today for a one-off fee',
  balanceDueDay({ today, termsDays: 0, feeDays: [null] }),
  today,
);
expect(
  'a negative setting is treated as no terms',
  balanceDueDay({ today, termsDays: -5, feeDays: [null] }),
  today,
);
expect(
  'nothing ticked is due on the terms',
  balanceDueDay({ today, termsDays: terms, feeDays: [] }),
  onTerms,
);
{
  const feeDays = ['2027-02-01', '2027-01-10'];
  balanceDueDay({ today, termsDays: terms, feeDays });
  expect('the fee days given are left as they were', feeDays, ['2027-02-01', '2027-01-10']);
}

// ── The day staff chose on the form ─────────────────────────────────────────

expect('an empty field leaves it to the rule', chosenBalanceDay('', today), { day: null });
expect('a later day is taken', chosenBalanceDay('2027-01-15', today), { day: '2027-01-15' });
expect('today is allowed', chosenBalanceDay(today, today), { day: today });
expect('a day before today is refused', chosenBalanceDay('2026-11-18', today), {
  error: 'The balance cannot be due before today.',
});
expect('a day that is not a date is refused', chosenBalanceDay('next week', today), {
  error: 'Enter the date the balance is due.',
});

if (failures.length > 0) {
  console.error(`Billing check failed:\n${failures.map((failure) => `  ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log(
  'Billing check passed: a part payment is due on the terms unless every fee is a renewal, and a chosen day is checked.',
);
