'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './SelectField.module.css';

interface SelectFieldProps {
  label: string;
  options: ReadonlyArray<string>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(Math.max(options.indexOf(value), 0));
        } else {
          setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(Math.max(options.indexOf(value), 0));
        } else if (activeIndex >= 0) {
          selectOption(options[activeIndex]);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.field} ref={rootRef}>
      <span className={styles.label} id={`${fieldId}-label`}>
        {label}
      </span>

      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${
          value ? '' : styles.isPlaceholder
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${fieldId}-label`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span>{value || placeholder}</span>
        <ChevronDown
          size={18}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          className={styles.list}
          role="listbox"
          aria-labelledby={`${fieldId}-label`}
        >
          {options.map((option, index) => {
            const selected = value === option;
            return (
              <li
                key={option}
                role="option"
                aria-selected={selected}
                className={`${styles.option} ${selected ? styles.optionSelected : ''} ${
                  activeIndex === index ? styles.optionActive : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span>{option}</span>
                {selected && <Check size={16} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
