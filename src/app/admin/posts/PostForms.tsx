'use client';

import React, { useActionState, useState } from 'react';
import { archivePost, createPost, savePost, setPostStatus, type PostState } from './actions';
import { RichText } from '@/components/console/RichText';
import { DateField, TextAreaField, TextField } from '@/components/console/Fields';
import styles from '../Admin.module.css';
import forms from '@/styles/forms.module.css';

const INITIAL: PostState = { status: 'idle' };

function Result({ state }: { state: PostState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.status === 'error' ? forms.error : forms.hint}
      role="status"
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

/** Just a title and an address; everything else happens in the editor. */
export function NewPostForm() {
  const [state, action, pending] = useActionState(createPost, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <div className={forms.grid}>
        <TextField
          name="title"
          label="Title"
          wide
          required
          maxLength={200}
          invalid={state.field === 'title'}
          disabled={pending}
        />
        <TextField
          name="slug"
          label="Address"
          optional
          wide
          maxLength={120}
          placeholder="what-professional-means-tourism-website"
          invalid={state.field === 'slug'}
          disabled={pending}
          hint="The part after /blog/. Left empty it is made from the title. It cannot be changed once people have the link."
        />
      </div>
      <div className={forms.actions}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Creating…' : 'Start writing'}
        </button>
        <p className={forms.payoff}>Created as a draft. Nothing is on the site until you publish.</p>
      </div>
      <Result state={state} />
    </form>
  );
}

export type PostDraft = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  coverImage: string;
  coverAlt: string;
  publishedAt: string;
  published: boolean;
};

export function PostEditor({ post }: { post: PostDraft }) {
  const [state, action, pending] = useActionState(savePost, INITIAL);
  const [body, setBody] = useState(post.body);

  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="postId" value={post.id} />

      <div className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>The post</h2>
          <span className={forms.cardMeta}>
            About {minutes} minute{minutes === 1 ? '' : 's'} to read
          </span>
        </div>

        <div className={forms.grid}>
          <TextField
            name="title"
            label="Title"
            wide
            required
            defaultValue={post.title}
            maxLength={200}
            invalid={state.field === 'title'}
            disabled={pending}
          />
          <TextAreaField
            name="excerpt"
            label="Summary"
            wide
            defaultValue={post.excerpt}
            maxLength={400}
            invalid={state.field === 'excerpt'}
            disabled={pending}
            hint="One or two sentences. This is what appears on the cards and in search results, so it is worth as much care as the opening line."
          />

          {/* Inside the grid as a full-width field, so it keeps the same
              spacing from the summary above it as every other field. */}
          <div className={`${forms.field} ${forms.wide}`}>
            <span className={forms.label}>Body</span>
            <RichText
              name="body"
              label="Body"
              profile="post"
              initialMarkdown={post.body}
              onMarkdownChange={setBody}
              disabled={pending}
              minHeight="tall"
              hint="Headings, lists, quotes, links, code and images. An image needs a path the site already serves, like /editorial/name.webp."
            />
          </div>
        </div>
      </div>

      <div className={forms.card}>
        <div className={forms.cardHeader}>
          <h2 className={forms.cardTitle}>How it appears</h2>
        </div>
        <div className={forms.grid}>
          <TextField
            name="coverImage"
            label="Cover image"
            optional
            defaultValue={post.coverImage}
            maxLength={200}
            placeholder="/editorial/name.webp"
            invalid={state.field === 'coverImage'}
            disabled={pending}
            hint="Leave it empty and the post gets one of the six standard illustrations, picked from its address. It will not change afterwards."
          />
          <TextField
            name="coverAlt"
            label="Describe the cover"
            optional
            defaultValue={post.coverAlt}
            maxLength={300}
            invalid={state.field === 'coverAlt'}
            disabled={pending}
            hint="For anyone who cannot see it. Required if there is a cover."
          />
          <TextField
            name="tags"
            label="Tags"
            optional
            wide
            defaultValue={post.tags.join(', ')}
            maxLength={200}
            placeholder="Product, AI, Tanzania"
            invalid={state.field === 'tags'}
            disabled={pending}
            hint="Separated by commas. Up to eight."
          />
          <DateField
            name="publishedAt"
            label="Dated"
            defaultValue={post.publishedAt}
            disabled={pending}
            hint="A date in the future holds it back until then, even once published."
          />
        </div>

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
          <p className={forms.payoff}>
            {post.published
              ? 'This is live, so saving changes what people see straight away.'
              : 'Still a draft. Nothing is on the site until you publish.'}
          </p>
        </div>
        <Result state={state} />
      </div>
    </form>
  );
}

export function PublishControls({ postId, published }: { postId: string; published: boolean }) {
  const [state, action, pending] = useActionState(setPostStatus, INITIAL);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="postId" value={postId} />
      {/* The checkbox carries the intent, so one action handles both ways. */}
      <input type="hidden" name="publish" value={published ? '' : 'on'} />
      <div className={styles.inlineForm}>
        <button
          type="submit"
          className={`${forms.button} ${published ? forms.danger : ''}`}
          disabled={pending}
        >
          {pending ? 'Working…' : published ? 'Take it down' : 'Publish'}
        </button>
        <Result state={state} />
      </div>
      <p className={forms.hint}>
        {published
          ? 'It comes off the blog, the home page and the sitemap immediately.'
          : 'It goes on the blog, the home page and the sitemap immediately.'}
      </p>
    </form>
  );
}

/**
 * Archiving, behind a second press.
 *
 * Same shape as voiding an invoice: the first press only reveals what the
 * second one will do, so nothing irreversible is ever one click away.
 */
export function ArchiveControl({ postId, published }: { postId: string; published: boolean }) {
  const [state, action, pending] = useActionState(archivePost, INITIAL);
  const [open, setOpen] = useState(false);

  if (published) {
    return (
      <p className={forms.hint}>
        Take it down before archiving it. Archiving should not be how something leaves the blog.
      </p>
    );
  }

  if (!open) {
    return (
      <div className={styles.inlineForm}>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(true)}
        >
          Archive this post
        </button>
      </div>
    );
  }

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="postId" value={postId} />
      <p className={forms.hint}>
        It leaves the journal but the post itself is kept, so the address stays spoken for and
        nothing that happened to it loses its record.
      </p>
      <div className={styles.inlineForm}>
        <button type="submit" className={`${forms.button} ${forms.danger}`} disabled={pending}>
          {pending ? 'Archiving…' : 'Archive it'}
        </button>
        <button
          type="button"
          className={`${forms.button} ${forms.quiet}`}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Keep it
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
