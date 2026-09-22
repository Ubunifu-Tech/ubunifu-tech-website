'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { type Extensions } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Image } from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Typography } from '@tiptap/extension-typography';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
} from 'lucide-react';
import { documentToMarkdown } from '@/lib/console/tiptap';
import { renderMarkdown } from '@/lib/console/markdown';
import styles from './RichText.module.css';

/**
 * The writing surface for contracts and posts.
 *
 * Configured to exactly what src/lib/console/markdown.ts can render, and no
 * more. Every extension that is switched off is switched off on purpose: a
 * shape the renderer does not know would come back as plain text, and on a
 * contract that is the document changing under the signer between the draft
 * and the send. check:editor asserts the round trip is lossless.
 *
 * Content loads by running the stored markdown through the real renderer and
 * handing Tiptap the HTML, so the renderer is the single definition of what the
 * content is — in both directions — rather than two implementations that drift.
 *
 * The value posts as markdown in a hidden field, so the server action, the
 * database and the hash are all unchanged by the editor existing.
 */

/**
 * Two profiles, because the two things being written are not the same.
 *
 * A contract wants tables — fee schedules are the reason tables exist here —
 * but a code block in an agreement is noise. A post wants code and images. The
 * renderer handles both sets either way; this is about what is offered.
 */
export type RichTextProfile = 'document' | 'post';

export function RichText({
  name,
  initialMarkdown,
  disabled = false,
  minHeight = 'tall',
  profile = 'document',
  label,
  hint,
  onMarkdownChange,
  uploadImage,
}: {
  name: string;
  initialMarkdown: string;
  disabled?: boolean;
  minHeight?: 'tall' | 'short';
  profile?: RichTextProfile;
  label: string;
  hint?: string;
  onMarkdownChange?: (markdown: string) => void;
  /**
   * Given a file, stores it and returns its address. When present the Image
   * button picks a file instead of asking for a path — a post's pictures no
   * longer have to be committed to the repository before they can be used.
   */
  uploadImage?: (
    file: File,
    onProgress: (percent: number) => void,
  ) => Promise<{ ok: true; path: string } | { ok: false; message: string }>;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  // Looked up by id when the button is pressed, rather than held in a ref the
  // toolbar would read while rendering.
  const fileInputId = useId();
  const [imageStatus, setImageStatus] = useState<string | null>(null);

  const initialHtml = useMemo(
    () => renderMarkdown(initialMarkdown) || '<p></p>',
    [initialMarkdown],
  );

  const extensions: Extensions = useMemo(() => {
    const base: Extensions = [
      StarterKit.configure({
        /**
         * Matched to the renderer, which emits h3/h4/h5 for two, three and
         * four hashes because a document sits below the page's own h1.
         * Configuring 2–4 here silently demoted every fourth-level heading to
         * a paragraph on load.
         */
        heading: { levels: [3, 4, 5] },
        link: {
          openOnClick: false,
          autolink: true,
          // Matches safeUrl() in the renderer. A scheme it will not render is
          // a scheme the editor should not let anybody add.
          protocols: ['http', 'https'],
        },
        // No markdown equivalent, so it would be lost on save.
        underline: false,
        // A post shows code; an agreement with a code block in it is noise.
        // `false` switches an extension off, so the flag has to become that
        // literal rather than a boolean.
        code: profile === 'post' ? undefined : (false as const),
        codeBlock: profile === 'post' ? undefined : (false as const),
      }),
      // Smart quotes and dashes as you type. It changes the characters, not the
      // structure, so what is hashed is exactly what was typed.
      Typography,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
    ];

    if (profile === 'post') {
      base.push(Image.configure({ inline: false, allowBase64: false }));
    }
    return base;
  }, [profile]);

  const editor = useEditor(
    {
      // Tiptap must not render during SSR, or the server and client markup
      // disagree and React throws away the whole tree on hydration.
      immediatelyRender: false,
      editable: !disabled,
      extensions,
      content: initialHtml,
      editorProps: {
        attributes: { class: styles.surface, 'aria-label': label },
      },
      onUpdate: ({ editor: instance }) => {
        const next = documentToMarkdown(instance.getJSON());
        setMarkdown(next);
        onMarkdownChange?.(next);
      },
    },
    [extensions],
  );

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const tool = useCallback(
    (key: string, Icon: typeof Bold, title: string, isActive: boolean, run: () => void) => (
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

  /** Prompted rather than typed inline, so the URL is validated before it lands. */
  const setLink = useCallback(() => {
    if (!editor) return;
    const existing = String(editor.getAttributes('link').href ?? '');
    const entered = window.prompt('Link to where?', existing);
    if (entered === null) return;

    if (entered.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: entered.trim() })
      .run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    if (uploadImage) {
      document.getElementById(fileInputId)?.click();
      return;
    }
    const src = window.prompt('Image address: a path like /editorial/name.webp, or a full URL');
    if (!src?.trim()) return;
    const alt = window.prompt('Describe the image for anyone who cannot see it') ?? '';
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }, [editor, uploadImage, fileInputId]);

  const onImagePicked = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !editor || !uploadImage) return;

      setImageStatus(`Uploading ${file.name}…`);
      const result = await uploadImage(file, (percent) =>
        setImageStatus(`Uploading ${file.name}: ${percent}%`),
      );
      if (!result.ok) {
        setImageStatus(result.message);
        return;
      }

      // Asked after the upload, not before: a description of a picture that
      // then failed to arrive is a question wasted.
      const alt =
        window.prompt('Describe the image for anyone who cannot see it', '')?.trim() ?? '';
      editor.chain().focus().setImage({ src: result.path, alt }).run();
      setImageStatus(alt ? null : 'Added without a description. Screen readers will skip it.');
    },
    [editor, uploadImage],
  );

  const words = editor?.storage.characterCount?.words?.() ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label={`${label} formatting`}>
        {editor && (
          <>
            {tool('bold', Bold, 'Bold', editor.isActive('bold'), () =>
              editor.chain().focus().toggleBold().run(),
            )}
            {tool('italic', Italic, 'Italic', editor.isActive('italic'), () =>
              editor.chain().focus().toggleItalic().run(),
            )}
            {tool('strike', Strikethrough, 'Strike', editor.isActive('strike'), () =>
              editor.chain().focus().toggleStrike().run(),
            )}
            {tool('link', LinkIcon, 'Link', editor.isActive('link'), setLink)}

            <span className={styles.toolDivider} aria-hidden="true" />

            {tool('h2', Heading2, 'Heading', editor.isActive('heading', { level: 3 }), () =>
              editor.chain().focus().toggleHeading({ level: 3 }).run(),
            )}
            {tool('h3', Heading3, 'Sub-heading', editor.isActive('heading', { level: 4 }), () =>
              editor.chain().focus().toggleHeading({ level: 4 }).run(),
            )}

            <span className={styles.toolDivider} aria-hidden="true" />

            {tool('ul', List, 'Bullets', editor.isActive('bulletList'), () =>
              editor.chain().focus().toggleBulletList().run(),
            )}
            {tool('ol', ListOrdered, 'Numbered', editor.isActive('orderedList'), () =>
              editor.chain().focus().toggleOrderedList().run(),
            )}
            {tool('quote', Quote, 'Quote', editor.isActive('blockquote'), () =>
              editor.chain().focus().toggleBlockquote().run(),
            )}

            <span className={styles.toolDivider} aria-hidden="true" />

            {tool('table', TableIcon, 'Table', editor.isActive('table'), () =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
                .run(),
            )}
            {profile === 'post' &&
              tool('code', Code, 'Code', editor.isActive('codeBlock'), () =>
                editor.chain().focus().toggleCodeBlock().run(),
              )}
            {profile === 'post' && tool('image', ImageIcon, 'Image', false, addImage)}
            {tool('hr', Minus, 'Divider', false, () =>
              editor.chain().focus().setHorizontalRule().run(),
            )}

            <span className={styles.toolDivider} aria-hidden="true" />

            {tool('undo', Undo2, 'Undo', false, () => editor.chain().focus().undo().run())}
            {tool('redo', Redo2, 'Redo', false, () => editor.chain().focus().redo().run())}
          </>
        )}
      </div>

      <div className={`${styles.frame} ${minHeight === 'short' ? styles.short : styles.tall}`}>
        <EditorContent editor={editor} />
      </div>

      {/* What the server actually receives. The editor is an input method; the
          stored format has not changed. */}
      <input type="hidden" name={name} value={markdown} />

      {uploadImage && (
        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className={styles.fileInput}
          onChange={onImagePicked}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      <div className={styles.foot}>
        {imageStatus ? (
          <p className={styles.hint} role="status" aria-live="polite">
            {imageStatus}
          </p>
        ) : (
          hint && <p className={styles.hint}>{hint}</p>
        )}
        <p className={styles.count}>
          {words} {words === 1 ? 'word' : 'words'}
        </p>
      </div>
    </div>
  );
}
