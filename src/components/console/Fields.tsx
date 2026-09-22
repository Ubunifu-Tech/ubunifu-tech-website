'use client';

import React, { useId, useState } from 'react';
import forms from '@/styles/forms.module.css';

/**
 * The form controls, as components rather than class names.
 *
 * Every form in the console and the portal builds from these, so a control is
 * styled once and is styled everywhere. Passing the classes around by hand is
 * how a native date picker and a bare number spinner ended up on a screen next
 * to painted selects.
 */

type Common = {
  name: string;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  wide?: boolean;
  required?: boolean;
};

function Wrapper({
  id,
  label,
  hint,
  optional,
  wide,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${forms.field} ${wide ? forms.wide : ''}`}>
      <label className={forms.label} htmlFor={id}>
        {label} {optional && <span className={forms.optional}>(optional)</span>}
      </label>
      {children}
      {hint && <p className={forms.hint}>{hint}</p>}
    </div>
  );
}

export function TextField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  required,
  type = 'text',
  ...rest
}: Common &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'className' | 'id'> & {
    type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <input
        id={id}
        name={name}
        type={type}
        className={forms.control}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        required={required}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  required,
  ...rest
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'className' | 'id'>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <textarea
        id={id}
        name={name}
        className={`${forms.control} ${forms.textarea}`}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        required={required}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  children,
  ...rest
}: Common & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'className' | 'id'>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <span className={forms.selectWrap}>
        <select
          id={id}
          name={name}
          className={`${forms.control} ${forms.select}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          {...rest}
        >
          {children}
        </select>
      </span>
    </Wrapper>
  );
}

export function NumberField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  suffix,
  ...rest
}: Common &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'className' | 'id' | 'type'> & {
    /** "days", "%", a currency code — whatever the number is measured in. */
    suffix?: string;
  }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <span className={forms.affixWrap}>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          className={`${forms.control} ${forms.number}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          {...rest}
        />
        {suffix && (
          <span className={forms.affix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </span>
    </Wrapper>
  );
}

/** 2026-09-22 into "22 September 2026", without a timezone shifting the day. */
function readable(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**
 * A date field that says which date it means.
 *
 * The native control shows the browser's locale format, and on a machine set to
 * US English that is mm/dd/yyyy — so 03/04 is either March or April depending
 * on who is reading it. For a Tanzanian business writing target dates into
 * contracts that is not a cosmetic problem.
 *
 * The input stays native, because the platform picker is the right one on a
 * phone and the value is always YYYY-MM-DD on the wire whatever is displayed.
 * What is added is an unambiguous echo of the chosen date underneath, which
 * removes the ambiguity without replacing a control people already know.
 */
export function DateField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  required,
  defaultValue,
  min,
  max,
  onChange,
}: Common & {
  defaultValue?: string;
  min?: string;
  max?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? '');
  const spelled = readable(value);

  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <input
        id={id}
        name={name}
        type="date"
        // Respected by Firefox and Safari; Chromium follows the browser locale
        // regardless, which is why the echo below exists.
        lang="en-GB"
        className={`${forms.control} ${forms.date}`}
        aria-invalid={invalid || undefined}
        aria-describedby={spelled ? `${id}-spelled` : undefined}
        disabled={disabled}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event);
        }}
      />
      <p className={spelled ? forms.dateEcho : forms.hint} id={`${id}-spelled`}>
        {spelled ?? 'No date set'}
      </p>
    </Wrapper>
  );
}

/** A checkbox with its explanation, as one target. */
export function CheckField({
  name,
  label,
  hint,
  disabled,
  wide,
  ...rest
}: Omit<Common, 'label' | 'optional' | 'invalid'> & {
  label: React.ReactNode;
  hint?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'className' | 'id' | 'type'>) {
  const id = useId();
  return (
    <div className={wide ? forms.wide : undefined}>
      <label className={forms.checkRow} htmlFor={id}>
        <input
          id={id}
          name={name}
          type="checkbox"
          className={forms.check}
          disabled={disabled}
          {...rest}
        />
        <span className={forms.checkText}>
          <span>{label}</span>
          {hint && <span className={forms.hint}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
