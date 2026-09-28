'use client';

import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

/**
 * A modal dialog, open for as long as it is mounted. Mount it in response to
 * something the person did, never on page load.
 *
 * Built on the native <dialog> and showModal(), which make the page behind
 * inert, close on Escape and draw the backdrop, so none of that is hand-made.
 * Focus goes to the element inside marked data-autofocus: React's autoFocus
 * runs before showModal() and is lost. On close, focus goes to whatever
 * returnFocus finds at that moment, so it can follow an element that moved
 * while the dialog was open.
 */
export function Modal({
  id,
  label,
  labelledBy,
  placement = 'center',
  className,
  onClose,
  returnFocus,
  children,
}: {
  id?: string;
  label?: string;
  labelledBy?: string;
  placement?: 'center' | 'start';
  /** The box itself. */
  className?: string;
  /** Called on Escape, a backdrop click or a close by the browser. Must be safe to call twice. */
  onClose: () => void;
  returnFocus?: () => HTMLElement | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const restore = useEffectEvent(() => {
    requestAnimationFrame(() => returnFocus?.()?.focus());
  });

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (dialog.isConnected && dialog.open) dialog.close();
      restore();
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`${styles.modal} ${styles[placement]}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Only a close nobody asked for: the browser closing it after a cancel
      // it would not let us stop. The Strict Mode remount in development
      // closes and reopens it at once, and that must not count.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={className}>{children}</div>
    </dialog>,
    document.body,
  );
}
