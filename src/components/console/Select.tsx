'use client';

import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import styles from './Controls.module.css';

export type SelectOption = {
  value: string;
  label: string;
  /** A second, quieter line under the label in the open menu. */
  description?: string;
  /** The same, under the name some option lists already use. */
  hint?: string;
  disabled?: boolean;
};

/**
 * A dropdown whose open menu is ours.
 *
 * A native <select> can be painted closed, but the list it opens belongs to the
 * operating system — grey, square, and a different font on every machine. This
 * keeps the native behaviour people rely on (type to jump, arrow keys, Escape,
 * screen-reader announcements) and draws the menu itself.
 *
 * The value reaches the form through a hidden input, so a server action reads
 * it exactly as it read the old <select>.
 */

/** Radix reserves the empty string, so "no value" travels under this name. */
const EMPTY = '__empty__';
const toRadix = (value: string) => (value === '' ? EMPTY : value);
const fromRadix = (value: string) => (value === EMPTY ? '' : value);

export function Select({
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Choose…',
  disabled,
  invalid,
  id,
  size = 'md',
  autoSubmit,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  name?: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  size?: 'md' | 'sm';
  /** Submit the surrounding form as soon as a choice is made. */
  autoSubmit?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const trigger = useRef<HTMLButtonElement>(null);

  function change(next: string) {
    const plain = fromRadix(next);
    // Flushed so the hidden input already holds the new value when the form
    // is submitted on the very next line.
    flushSync(() => {
      if (value === undefined) setInner(plain);
      onValueChange?.(plain);
    });
    if (autoSubmit) trigger.current?.form?.requestSubmit();
  }

  const selected = options.find((option) => option.value === current);

  return (
    <>
      <RadixSelect.Root
        value={selected ? toRadix(current) : undefined}
        onValueChange={change}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          ref={trigger}
          id={id}
          className={`${styles.trigger} ${size === 'sm' ? styles.triggerSmall : ''}`}
          aria-invalid={invalid || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
        >
          <RadixSelect.Value placeholder={<span className={styles.placeholder}>{placeholder}</span>} />
          <RadixSelect.Icon className={styles.triggerIcon}>
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content position="popper" sideOffset={6} className={styles.menu}>
            <RadixSelect.Viewport className={styles.menuViewport}>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={toRadix(option.value)}
                  disabled={option.disabled}
                  className={styles.item}
                >
                  <span className={styles.itemText}>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    {(option.description ?? option.hint) && (
                      <span className={styles.itemDescription}>
                        {option.description ?? option.hint}
                      </span>
                    )}
                  </span>
                  <RadixSelect.ItemIndicator className={styles.itemCheck}>
                    <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {name && <input type="hidden" name={name} value={current} />}
    </>
  );
}

/**
 * Reads <option> children into options, so a form written against the native
 * element keeps working unchanged.
 */
export function optionsFromChildren(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: string | number;
      children?: React.ReactNode;
      disabled?: boolean;
    };
    if (child.type === 'option') {
      options.push({
        value: String(props.value ?? ''),
        label: React.Children.toArray(props.children).join(''),
        disabled: props.disabled,
      });
    } else if (child.type === React.Fragment) {
      options.push(...optionsFromChildren(props.children));
    }
  });
  return options;
}
