'use client';

import React, { useId } from 'react';
import { Select, optionsFromChildren } from './Select';
import { DatePicker } from './DatePicker';
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
  /** For a typed field; a picker's value is checked when the form is saved. */
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
  defaultValue,
  value,
  onChange,
  placeholder,
  children,
}: Omit<Common, 'required'> & {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** <option> elements, exactly as a native select would take them. */
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <Select
        id={id}
        name={name}
        options={optionsFromChildren(children)}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        invalid={invalid}
      />
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

/** A date, picked from a calendar and always shown as "Tue, 22 Sep 2026". */
export function DateField({
  name,
  label,
  hint,
  optional,
  invalid,
  disabled,
  wide,
  defaultValue,
  min,
  max,
  onChange,
}: Omit<Common, 'required'> & {
  defaultValue?: string;
  min?: string;
  max?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} optional={optional} wide={wide}>
      <DatePicker
        id={id}
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        onChange={onChange}
        disabled={disabled}
        invalid={invalid}
        clearable={optional}
      />
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
