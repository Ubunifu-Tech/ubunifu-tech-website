'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Controls.module.css';

/**
 * A date picker that reads the same everywhere.
 *
 * The browser's own date input shows mm/dd/yyyy on a machine set to US English,
 * so 03/04 is March or April depending on who is looking — and its calendar
 * cannot be styled at all. This one always says "Tue, 22 Sep 2026", starts the
 * week on Monday, and still sends YYYY-MM-DD to the server in a hidden input,
 * so nothing that reads the value has to change.
 */

/** "2026-09-22" as a local date, at noon so no timezone moves the day. */
function parse(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!, 12);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const display = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function DatePicker({
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  disabled,
  invalid,
  id,
  placeholder = 'Pick a date',
  clearable = true,
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  /** Small for a table row: a shorter date and a smaller control. */
  size?: 'md' | 'sm';
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const current = value ?? inner;
  const selected = parse(current);
  const earliest = parse(min);
  const latest = parse(max);

  function set(next: string) {
    if (value === undefined) setInner(next);
    onChange?.(next);
  }

  const today = format(new Date());
  const todayAllowed = (!min || today >= min) && (!max || today <= max);

  const blocked = [
    ...(earliest ? [{ before: earliest }] : []),
    ...(latest ? [{ after: latest }] : []),
  ];

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            className={size === 'sm' ? `${styles.trigger} ${styles.triggerSmall}` : styles.trigger}
            // aria-invalid is not valid on a button; the form's own error
            // message says what is wrong, and this only draws the red edge.
            data-invalid={invalid || undefined}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
          >
            <span className={selected ? undefined : styles.placeholder}>
              {selected ? (size === 'sm' ? short : display).format(selected) : placeholder}
            </span>
            <CalendarDays size={16} strokeWidth={2} className={styles.triggerIcon} aria-hidden="true" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className={styles.calendar}>
            <DayPicker
              mode="single"
              selected={selected}
              defaultMonth={selected ?? earliest ?? latest}
              onSelect={(date) => {
                if (!date) return;
                set(format(date));
                setOpen(false);
              }}
              weekStartsOn={1}
              showOutsideDays
              autoFocus
              disabled={blocked}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                  ),
              }}
              classNames={{
                root: styles.dp,
                months: styles.dpMonths,
                month: styles.dpMonth,
                month_caption: styles.dpCaption,
                caption_label: styles.dpCaptionLabel,
                nav: styles.dpNav,
                button_previous: styles.dpNavButton,
                button_next: styles.dpNavButton,
                month_grid: styles.dpGrid,
                weekdays: styles.dpWeekdays,
                weekday: styles.dpWeekday,
                week: styles.dpWeek,
                day: styles.dpDay,
                day_button: styles.dpDayButton,
                today: styles.dpToday,
                selected: styles.dpSelected,
                outside: styles.dpOutside,
                disabled: styles.dpDisabled,
              }}
            />
            <div className={styles.calendarFoot}>
              {clearable && current ? (
                <button
                  type="button"
                  className={styles.calendarLink}
                  onClick={() => {
                    set('');
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className={styles.calendarLink}
                disabled={!todayAllowed}
                onClick={() => {
                  set(today);
                  setOpen(false);
                }}
              >
                Today
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {name && <input type="hidden" name={name} value={current} />}
    </>
  );
}
