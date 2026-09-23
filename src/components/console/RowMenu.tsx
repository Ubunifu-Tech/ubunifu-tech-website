'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { MoreHorizontal } from 'lucide-react';
import styles from './RowMenu.module.css';

/**
 * A row's actions behind one button, so a table row carries a single control
 * rather than a line of links running into each other. The panel holds real
 * forms, which is why it is a popover and not a menu of callbacks: an item
 * can post a server action, open a small form, or ask "are you sure" in place.
 */
export function RowMenu({
  label,
  open,
  onOpenChange,
  wide = false,
  children,
}: {
  /** Read to screen readers: "Actions for Tito Meoki". */
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Room for a form rather than a list. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const change = (next: boolean) => (onOpenChange ? onOpenChange(next) : setInner(next));

  return (
    <Popover.Root open={isOpen} onOpenChange={change}>
      <Popover.Trigger className={styles.trigger} aria-label={label} title="Actions">
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`${styles.panel} ${wide ? styles.wide : ''}`}
          align="end"
          sideOffset={6}
          collisionPadding={12}
          // A link closes the menu: the page it opens may be this same page.
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) change(false);
          }}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The list of choices in a row's menu. */
export function MenuList({ children }: { children: React.ReactNode }) {
  return <div className={styles.list}>{children}</div>;
}

type ItemProps = {
  danger?: boolean;
  children: React.ReactNode;
};

/** A choice that does something here: opens a form, or submits the one it sits in. */
export function MenuItem({
  danger,
  children,
  ...rest
}: ItemProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button type="button" className={`${styles.item} ${danger ? styles.danger : ''}`} {...rest}>
      {children}
    </button>
  );
}

/** A choice that goes somewhere. */
export function MenuLink({
  href,
  danger,
  scroll,
  children,
}: ItemProps & { href: string; scroll?: boolean }) {
  return (
    <Link href={href} scroll={scroll} className={`${styles.item} ${danger ? styles.danger : ''}`}>
      {children}
    </Link>
  );
}

export function MenuDivider() {
  return <hr className={styles.divider} />;
}

/** What the last choice did, said under the list. */
export function MenuNote({
  tone = 'quiet',
  children,
}: {
  tone?: 'quiet' | 'bad';
  children: React.ReactNode;
}) {
  return (
    <p
      className={`${styles.note} ${tone === 'bad' ? styles.noteBad : ''}`}
      role="status"
      aria-live="polite"
    >
      {children}
    </p>
  );
}

/** A heading for a panel that has turned into a form or a question. */
export function MenuTitle({ children }: { children: React.ReactNode }) {
  return <p className={styles.title}>{children}</p>;
}
