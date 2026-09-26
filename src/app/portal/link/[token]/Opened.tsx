'use client';

import { useEffect } from 'react';
import { markLinkOpened } from './actions';

/** Tells us the page is open in someone's browser, once. Link previews do not run this. */
export function Opened({ token }: { token: string }) {
  useEffect(() => {
    void markLinkOpened(token);
  }, [token]);
  return null;
}
