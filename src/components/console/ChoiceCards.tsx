'use client';

import { useId } from 'react';
import styles from './ChoiceCards.module.css';

export type Choice = { value: string; label: string; description?: string };

/**
 * A choice between a few options, shown as cards rather than a dropdown, so
 * every option and what it means can be read before picking. Native radio
 * inputs underneath: arrow keys move between them and the value posts with the
 * form under `name`.
 */
export function ChoiceCards({
  name,
  choices,
  value,
  onChange,
  legend,
  columns = 2,
}: {
  name: string;
  choices: readonly Choice[];
  value: string;
  onChange: (value: string) => void;
  legend: string;
  columns?: 2 | 3;
}) {
  const id = useId();
  return (
    <fieldset className={styles.set}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={`${styles.grid} ${columns === 3 ? styles.three : ''}`}>
        {choices.map((choice) => (
          <label key={choice.value} className={styles.card} htmlFor={`${id}-${choice.value}`}>
            <input
              id={`${id}-${choice.value}`}
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className={styles.radio}
            />
            <span className={styles.text}>
              <span className={styles.label}>{choice.label}</span>
              {choice.description && <span className={styles.description}>{choice.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
