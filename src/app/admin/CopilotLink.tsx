'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquareText } from 'lucide-react';
import { COPILOT } from '@/lib/console/staff-agent/identity';
import styles from './copilot/Thread.module.css';

/**
 * The way into Copilot from the top of every page. From a record's own page
 * it carries that record along, so the conversation opens already about it.
 */
export function CopilotLink() {
  const pathname = usePathname();
  const onRecord = /^\/(projects|clients|documents|invoices)\/(?!new$)[A-Za-z0-9_-]+$/.test(pathname);
  const here = pathname === '/copilot' || pathname.startsWith('/copilot/');
  return (
    <Link
      href={onRecord ? `/copilot?about=${encodeURIComponent(pathname)}` : '/copilot'}
      className={styles.trigger}
      aria-current={here ? 'page' : undefined}
    >
      <MessageSquareText size={16} aria-hidden />
      <span>{COPILOT.short}</span>
    </Link>
  );
}
