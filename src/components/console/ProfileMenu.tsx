'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, LogOut, Settings, UserRound, Users } from 'lucide-react';
import { Avatar } from './Avatar';
import styles from './ProfileMenu.module.css';

const ICONS = { profile: UserRound, team: Users, settings: Settings } as const;

export type ProfileLink = { href: string; label: string; icon: keyof typeof ICONS };

/**
 * Who is signed in, top right, and everything about their own account in
 * one place: their profile, the people they work with, and signing out.
 */
export function ProfileMenu({
  name,
  email,
  detail,
  links,
  signOutAction,
}: {
  name: string;
  email: string;
  /** A second line under the name: a role, or the organisation. */
  detail: string;
  links: ProfileLink[];
  /** Where the sign-out form posts. */
  signOutAction: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.pill} aria-label={`Account: ${name}`}>
        <Avatar name={name} size="sm" />
        <span className={styles.who}>
          <span className={styles.name}>{name}</span>
          <span className={styles.detail}>{detail}</span>
        </span>
        <ChevronDown size={15} strokeWidth={2} className={styles.chevron} aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.menu} align="end" sideOffset={8} collisionPadding={12}>
          <div className={styles.menuHead}>
            <Avatar name={name} size="md" />
            <div className={styles.menuWho}>
              <p className={styles.menuName}>{name}</p>
              <p className={styles.menuEmail}>{email}</p>
            </div>
          </div>
          <ul className={styles.items}>
            {links.map((link) => {
              const Icon = ICONS[link.icon];
              return (
                <li key={link.href}>
                  <Link href={link.href} className={styles.item} onClick={() => setOpen(false)}>
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* A plain POST form, so signing out works without JavaScript and an
              image tag cannot trigger it. */}
          <form action={signOutAction} method="post" className={styles.signOut}>
            <button type="submit" className={styles.item}>
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
