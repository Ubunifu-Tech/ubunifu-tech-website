'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import forms from '@/styles/forms.module.css';

/**
 * Printing is the client-side half of the receipt: the print stylesheet strips
 * the console away, so what comes out is the document on its own.
 */
export function PrintButton() {
  return (
    <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => window.print()}>
      <Printer size={15} strokeWidth={1.8} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
