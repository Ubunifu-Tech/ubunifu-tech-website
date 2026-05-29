'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import styles from './CodeWindow.module.css';

// A small editor-style panel that "writes" a short, representative snippet
// line by line. The code is a grounded AI agent tool — the kind of thing we
// actually build — not lorem ipsum. Honours prefers-reduced-motion (shows
// everything at once, no cursor sweep).

type Token = { text: string; kind?: 'kw' | 'fn' | 'str' | 'com' | 'type' | 'dec' | 'num' };

const LINES: Token[][] = [
  [{ text: '# A grounded agent. Every answer traces to real data', kind: 'com' }],
  [{ text: 'from', kind: 'kw' }, { text: ' ubunifu ' }, { text: 'import', kind: 'kw' }, { text: ' agent, db' }],
  [],
  [{ text: '@agent.tool', kind: 'dec' }],
  [
    { text: 'def', kind: 'kw' },
    { text: ' ' },
    { text: 'find_packages', kind: 'fn' },
    { text: '(query: ' },
    { text: 'str', kind: 'type' },
    { text: ') -> ' },
    { text: 'list', kind: 'type' },
    { text: '[Package]:' },
  ],
  [{ text: '    """Match a traveller to real safari packages."""', kind: 'str' }],
  [
    { text: '    hits = db.packages.' },
    { text: 'search', kind: 'fn' },
    { text: '(query, limit=' },
    { text: '5', kind: 'num' },
    { text: ')' },
  ],
  [
    { text: '    ' },
    { text: 'return', kind: 'kw' },
    { text: ' [p ' },
    { text: 'for', kind: 'kw' },
    { text: ' p ' },
    { text: 'in', kind: 'kw' },
    { text: ' hits ' },
    { text: 'if', kind: 'kw' },
    { text: ' p.available]' },
  ],
];

export const CodeWindow: React.FC = () => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? LINES.length : 0);

  useEffect(() => {
    if (reduce) return;
    if (shown >= LINES.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 260);
    return () => clearTimeout(t);
  }, [shown, reduce]);

  const done = shown >= LINES.length;

  return (
    <div className={styles.window} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.file}>agent.py</span>
      </div>
      <pre className={styles.body}>
        <code>
          {LINES.slice(0, shown).map((line, i) => (
            <span key={i} className={styles.line}>
              <span className={styles.ln}>{i + 1}</span>
              <span className={styles.code}>
                {line.length === 0 ? (
                  ' '
                ) : (
                  line.map((tok, j) => (
                    <span key={j} className={tok.kind ? styles[tok.kind] : undefined}>
                      {tok.text}
                    </span>
                  ))
                )}
                {!done && i === shown - 1 && <span className={styles.cursor} />}
              </span>
            </span>
          ))}
          {done && (
            <span className={styles.line}>
              <span className={styles.ln}>{LINES.length + 1}</span>
              <span className={styles.code}>
                <span className={styles.cursorSteady} />
              </span>
            </span>
          )}
        </code>
      </pre>
    </div>
  );
};
