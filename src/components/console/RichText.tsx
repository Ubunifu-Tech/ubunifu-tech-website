'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Minus } from 'lucide-react';
import { documentToMarkdown } from '@/lib/console/tiptap';
import { renderMarkdown } from '@/lib/console/markdown';
import styles from './RichText.module.css';

/**
 * The writing surface for contracts and posts.
 *
 * Configured to exactly what src/lib/console/markdown.ts can render, and no
 * more. Every extension below that is switched off is switched off on purpose:
 * a code block or a blockquote that the renderer does not know would come back
 * as plain text, and on a contract that is the document changing under the
 * signer between the draft and the send.
 *
 * Content loads by running the stored markdown through the real renderer and
 * handing Tiptap the HTML, so the renderer is the single definition of what the
 * content is — in both directions — rather than two implementations that drift.
 *
 * The value posts as markdown in a hidden field, so the server action, the
 * database and the hash are all unchanged by the editor existing.
 */
export function RichText({
  name,
  initialMarkdown,
  disabled = false,
  minHeight,
  label,
  hint,
  onMarkdownChange,
}: {
  name: string;
  initialMarkdown: string;
  disabled?: boolean;
  /** A contract wants a page; a blog excerpt wants a few lines. */
  minHeight?: 'tall' | 'short';
  label: string;
  hint?: string;
  onMarkdownChange?: (markdown: string) => void;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);

  const initialHtml = useMemo(
    () => renderMarkdown(initialMarkdown) || '<p></p>',
    [initialMarkdown],
  );

  const editor = useEditor({
    // Tiptap must not render during SSR, or the server and client markup
    // disagree and React throws away the whole tree on hydration.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        /**
         * Matched to the renderer, which emits h3/h4/h5 for ## / ### / ####
         * because a document starts below the page's own h1. Configuring
         * [2,3,4] here silently demoted every #### to a paragraph on load.
         */
        heading: { levels: [3, 4, 5] },
        // Not in the renderer, so not offered. See the note above.
        code: false,
        codeBlock: false,
        blockquote: false,
        strike: false,
        link: false,
        underline: false,
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: styles.surface,
        'aria-label': label,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const next = documentToMarkdown(instance.getJSON());
      setMarkdown(next);
      onMarkdownChange?.(next);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const button = useCallback(
    (
      key: string,
      Icon: typeof Bold,
      title: string,
      isActive: boolean,
      run: () => void,
    ) => (
      <button
        key={key}
        type="button"
        className={`${styles.tool} ${isActive ? styles.toolActive : ''}`}
        onClick={run}
        disabled={disabled}
        aria-pressed={isActive}
        title={title}
      >
        <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
        <span className={styles.toolLabel}>{title}</span>
      </button>
    ),
    [disabled],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>
        {editor && (
          <>
            {button('bold', Bold, 'Bold', editor.isActive('bold'), () =>
              editor.chain().focus().toggleBold().run(),
            )}
            {button('italic', Italic, 'Italic', editor.isActive('italic'), () =>
              editor.chain().focus().toggleItalic().run(),
            )}
            <span className={styles.toolDivider} aria-hidden="true" />
            {button(
              'h2',
              Heading2,
              'Heading',
              editor.isActive('heading', { level: 3 }),
              () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            )}
            {button(
              'h3',
              Heading3,
              'Sub-heading',
              editor.isActive('heading', { level: 4 }),
              () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
            )}
            <span className={styles.toolDivider} aria-hidden="true" />
            {button('ul', List, 'Bullets', editor.isActive('bulletList'), () =>
              editor.chain().focus().toggleBulletList().run(),
            )}
            {button('ol', ListOrdered, 'Numbered', editor.isActive('orderedList'), () =>
              editor.chain().focus().toggleOrderedList().run(),
            )}
            <span className={styles.toolDivider} aria-hidden="true" />
            {button('hr', Minus, 'Divider', false, () =>
              editor.chain().focus().setHorizontalRule().run(),
            )}
          </>
        )}
      </div>

      <div className={`${styles.frame} ${minHeight === 'short' ? styles.short : styles.tall}`}>
        <EditorContent editor={editor} />
      </div>

      {/* What the server actually receives. The editor is an input method; the
          stored format has not changed. */}
      <input type="hidden" name={name} value={markdown} />

      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
