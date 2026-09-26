'use client';

import { useActionState, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { saveBrandKit, type BrandState } from './brand-actions';
import { BrandKitView, type BrandKitData } from '@/components/console/BrandKitView';
import { TextAreaField } from '@/components/console/Fields';
import forms from '@/styles/forms.module.css';
import kitStyles from '@/components/console/BrandKit.module.css';
import styles from '../../Admin.module.css';

const IDLE: BrandState = { status: 'idle' };

type Row = { key: number; name: string; hex: string; usage: string };

/** What a typed code would paint, or null while it is not a colour yet. */
function paintable(hex: string): string | null {
  const bare = hex.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(bare) ? `#${bare.toUpperCase()}` : null;
}

export function BrandKitEditor({
  projectId,
  kit,
  editable,
}: {
  projectId: string;
  kit: BrandKitData | null;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => toRows(kit));
  const [nextKey, setNextKey] = useState(() => (kit?.colors.length ?? 0) + 1);
  const [state, action, pending] = useActionState(
    async (previous: BrandState, formData: FormData) => {
      const result = await saveBrandKit(previous, formData);
      if (result.status === 'done') setEditing(false);
      return result;
    },
    IDLE,
  );

  const empty =
    !kit ||
    (kit.colors.length === 0 &&
      !kit.typography &&
      !kit.principles &&
      !kit.imageryDirection &&
      !kit.notes);

  function start() {
    setRows(toRows(kit));
    setEditing(true);
  }

  function change(key: number, field: keyof Omit<Row, 'key'>, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function add() {
    setRows((current) => [...current, { key: nextKey, name: '', hex: '', usage: '' }]);
    setNextKey((key) => key + 1);
  }

  return (
    <section className={forms.card}>
      <div className={forms.cardHeader}>
        <h2 className={forms.cardTitle}>Brand kit</h2>
        {editable && !editing && (
          <button type="button" className={forms.link} onClick={start}>
            {empty ? 'Set it up' : 'Change'}
          </button>
        )}
      </div>

      {!editing ? (
        empty ? (
          <p className={styles.note}>
            {editable
              ? 'No brand kit yet. Add the colours and how type, layout and photos should feel. The client sees it in their portal.'
              : 'No brand kit yet.'}
          </p>
        ) : (
          <BrandKitView kit={kit!} showNotes />
        )
      ) : (
        <form action={action} className={forms.form}>
          <input type="hidden" name="projectId" value={projectId} />
          <input
            type="hidden"
            name="colors"
            value={JSON.stringify(rows.map(({ name, hex, usage }) => ({ name, hex, usage })))}
          />

          <div className={forms.field}>
            <span className={forms.label}>Colours</span>
            <div className={kitStyles.colorRows}>
              {rows.length > 0 && (
                <div className={`${kitStyles.colorRow} ${kitStyles.colorHead}`} aria-hidden="true">
                  <span />
                  <span>Name</span>
                  <span>Code</span>
                  <span>Where it is used</span>
                  <span />
                </div>
              )}
              {rows.map((row, index) => {
                const paint = paintable(row.hex);
                return (
                  <div key={row.key} className={kitStyles.colorRow}>
                    <span
                      className={kitStyles.preview}
                      style={paint ? { background: paint } : undefined}
                      aria-hidden="true"
                    />
                    <input
                      className={forms.control}
                      value={row.name}
                      onChange={(event) => change(row.key, 'name', event.target.value)}
                      placeholder="Espresso Brown"
                      aria-label={`Colour ${index + 1} name`}
                      maxLength={60}
                    />
                    <input
                      className={`${forms.control} ${kitStyles.hexInput}`}
                      value={row.hex}
                      onChange={(event) => change(row.key, 'hex', event.target.value)}
                      placeholder="#3A1B06"
                      aria-label={`Colour ${index + 1} code`}
                      aria-invalid={row.hex !== '' && !paint ? true : undefined}
                      maxLength={7}
                      spellCheck={false}
                      autoCapitalize="characters"
                    />
                    <input
                      className={forms.control}
                      value={row.usage}
                      onChange={(event) => change(row.key, 'usage', event.target.value)}
                      placeholder="Headings and primary buttons"
                      aria-label={`Where colour ${index + 1} is used`}
                      maxLength={200}
                    />
                    <button
                      type="button"
                      className={kitStyles.removeColor}
                      onClick={() =>
                        setRows((current) => current.filter((item) => item.key !== row.key))
                      }
                      aria-label={`Remove ${row.name || `colour ${index + 1}`}`}
                    >
                      <X size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
            {rows.length < 12 && (
              <button
                type="button"
                className={`${forms.button} ${forms.quiet} ${styles.addButton}`}
                onClick={add}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Add a colour
              </button>
            )}
          </div>

          <div className={forms.grid}>
            <TextAreaField
              name="typography"
              label="Type"
              optional
              rows={2}
              maxLength={2000}
              defaultValue={kit?.typography ?? ''}
              placeholder="A clean, modern sans-serif that reads quickly on a phone."
            />
            <TextAreaField
              name="principles"
              label="Layout"
              optional
              rows={2}
              maxLength={2000}
              defaultValue={kit?.principles ?? ''}
              placeholder="Plenty of space, sharp corners, buttons that stand out."
            />
            <TextAreaField
              name="imageryDirection"
              label="Photos"
              optional
              rows={2}
              maxLength={2000}
              defaultValue={kit?.imageryDirection ?? ''}
              placeholder="Real, high-resolution photos of the places and people."
            />
            <TextAreaField
              name="notes"
              label="Notes for the team"
              optional
              rows={2}
              maxLength={2000}
              defaultValue={kit?.notes ?? ''}
              hint="The client does not see these."
            />
          </div>

          <div className={forms.actions}>
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Saving…' : 'Save the brand kit'}
            </button>
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {state.status === 'error' && (
            <p className={forms.error} role="alert">
              {state.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

function toRows(kit: BrandKitData | null): Row[] {
  return (kit?.colors ?? []).map((color, index) => ({
    key: index + 1,
    name: color.name,
    hex: color.hex,
    usage: color.usage ?? '',
  }));
}
