'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/console/Select';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

/**
 * For an enquiry from a client we already have, written from an address we
 * do not know: pick the client, and the new project starts from the enquiry
 * and closes it.
 */
export function StartForClient({
  enquiryId,
  clients,
}: {
  enquiryId: string;
  clients: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  return (
    <div className={styles.inlineForm}>
      <label className={forms.label} htmlFor={`existing-${enquiryId}`}>
        Already a client?
      </label>
      <Select
        id={`existing-${enquiryId}`}
        name="client"
        value={slug || undefined}
        onValueChange={setSlug}
        placeholder="Choose the client"
        options={clients.map((client) => ({ value: client.slug, label: client.name }))}
      />
      <button
        type="button"
        className={`${forms.button} ${forms.quiet}`}
        disabled={!slug}
        onClick={() =>
          router.push(
            `/projects/new?client=${encodeURIComponent(slug)}&enquiry=${encodeURIComponent(enquiryId)}`,
          )
        }
      >
        Start a project for them
      </button>
    </div>
  );
}
