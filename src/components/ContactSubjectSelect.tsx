'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './ContactSubjectSelect.module.css';

type ContactSubjectSelectProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  invalid: boolean;
};

export function ContactSubjectSelect({ value, options, onChange, buttonRef, invalid }: ContactSubjectSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState({ above: false, maxHeight: 352 });
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef({ text: '', time: 0 });

  const positionMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 0;
    const below = viewportBottom - rect.bottom - 12;
    const above = rect.top - viewportTop - navHeight - 12;
    const useAbove = below < 352 && above > below;
    setPlacement({ above: useAbove, maxHeight: Math.max(96, Math.min(352, useAbove ? above : below)) });
  }, [buttonRef]);

  const showMenu = (index = Math.max(0, options.indexOf(value))) => {
    positionMenu();
    setActiveIndex(index);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    searchRef.current = { text: '', time: 0 };
  };

  const selectOption = (index: number) => {
    if (options[index] !== undefined && options[index] !== value) onChange(options[index]);
    closeMenu();
  };

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        searchRef.current = { text: '', time: 0 };
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    // Follow the visible viewport, including mobile keyboard changes.
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, { passive: true });
    window.visualViewport?.addEventListener('resize', positionMenu);
    window.visualViewport?.addEventListener('scroll', positionMenu);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu);
      window.visualViewport?.removeEventListener('resize', positionMenu);
      window.visualViewport?.removeEventListener('scroll', positionMenu);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !option) return;
    // Scroll only the popup, never the whole page, when navigating its options.
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [activeIndex, open, placement.maxHeight, placement.above]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!open) showMenu();
        else if (event.altKey && event.key === 'ArrowUp') selectOption(activeIndex);
        else if (!event.altKey) {
          setActiveIndex((index) => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        return;
      case 'Home':
      case 'End':
      case 'PageUp':
      case 'PageDown':
        event.preventDefault();
        showMenu(event.key === 'Home' || event.key === 'PageUp' ? 0 : options.length - 1);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) selectOption(activeIndex);
        else showMenu();
        return;
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
        }
        return;
      case 'Tab':
        if (open) selectOption(activeIndex);
        return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const now = Date.now();
    const search = (now - searchRef.current.time < 700 ? searchRef.current.text : '') + event.key.toLowerCase();
    searchRef.current = { text: search, time: now };
    const repeated = [...search].every((character) => character === search[0]);
    const query = repeated ? search[0] : search;
    const start = open ? activeIndex : options.indexOf(value);
    for (let offset = repeated ? 1 : 0; offset < options.length + (repeated ? 1 : 0); offset++) {
      const index = (start + offset + options.length) % options.length;
      if (options[index].toLowerCase().startsWith(query)) {
        showMenu(index);
        return;
      }
    }
    if (!open) showMenu();
  };

  return (
    <div
      ref={rootRef}
      className={styles.select}
      data-open={open}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) selectOption(activeIndex);
      }}
    >
      <input type="hidden" name="subject" value={value} />
      <button
        ref={buttonRef}
        id="subject"
        type="button"
        role="combobox"
        aria-labelledby="subject-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="subject-options"
        aria-activedescendant={open ? `subject-option-${activeIndex}` : undefined}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'contact-error' : undefined}
        className={styles.trigger}
        data-placeholder={!value}
        onClick={() => open ? closeMenu() : showMenu()}
        onKeyDown={handleKeyDown}
      >
        <span>{value || 'Select an enquiry type'}</span>
        <ChevronDown size={18} aria-hidden="true" className={styles.chevron} />
      </button>
      <ul
        ref={listRef}
        id="subject-options"
        role="listbox"
        aria-labelledby="subject-label"
        hidden={!open}
        className={styles.menu}
        data-above={placement.above}
        data-lenis-prevent
        style={{ maxHeight: placement.maxHeight }}
      >
        {options.map((option, index) => (
          <li
            key={option}
            id={`subject-option-${index}`}
            role="option"
            aria-selected={value === option}
            tabIndex={-1}
            className={styles.option}
            data-active={activeIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onPointerMove={(event) => {
              if (event.pointerType === 'mouse') setActiveIndex(index);
            }}
            onClick={() => {
              selectOption(index);
              buttonRef.current?.focus({ preventScroll: true });
            }}
          >
            <span>{option}</span>
            {value === option && <Check size={17} aria-hidden="true" className={styles.check} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
