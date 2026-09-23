'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Circle, Eye, Monitor, Smartphone, TriangleAlert, X } from 'lucide-react';
import { archivePost, savePost, setPostStatus, type PostState, type SaveIntent } from './actions';
import { RichText } from '@/components/console/RichText';
import { Select } from '@/components/console/Select';
import { DateField } from '@/components/console/Fields';
import { uploadWebsiteImage } from '@/components/console/uploadWebsiteImage';
import { BlogArticleView } from '@/components/BlogArticleView';
import { EditorialVisual } from '@/components/EditorialVisual';
import { coverForSlug } from '@/content/blog-covers';
import { formatDate, parseDateInput } from '@/lib/console/money';
import { slugify } from '@/lib/slug';
import forms from '@/styles/forms.module.css';
import blogStyles from '@/app/(site)/blog/[slug]/BlogSlug.module.css';
import styles from './PostStudio.module.css';

export type StudioPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  coverImage: string;
  coverAlt: string;
  authorName: string;
  /** YYYY-MM-DD, or empty for "the day it is published". */
  publishedAt: string;
  status: 'draft' | 'published';
  /** Published at least once, which fixes the address. */
  everPublished: boolean;
  version: string;
};

type SaveStatus =
  | { kind: 'clean' }
  | { kind: 'saving'; intent: SaveIntent }
  | { kind: 'saved'; at: Date; message?: string }
  | { kind: 'error'; message: string; field?: string }
  | { kind: 'conflict'; message: string };

const SITE = 'ubunifutech.com';
const TITLE_FITS = 60;
const SUMMARY_FITS = 160;

const words = (markdown: string) => markdown.trim().split(/\s+/).filter(Boolean).length;

/**
 * The journal editor.
 *
 * Writing on the left, everything about the post on the right. Drafts save
 * themselves a few seconds after typing stops; a live post only changes when
 * Update is pressed, because every save of it changes the site. Publishing
 * saves what is on screen and publishes it in one step.
 */
export function PostStudio({
  post,
  bylines,
  tagSuggestions,
  history,
}: {
  post: StudioPost;
  bylines: string[];
  tagSuggestions: string[];
  history: React.ReactNode;
}) {
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [body, setBody] = useState(post.body);
  // The editor reads its starting text once; later saves refresh the page's
  // data, and must not reach into what is being typed.
  const [initialBody] = useState(post.body);
  const [tags, setTags] = useState(post.tags);
  const [coverImage, setCoverImage] = useState(post.coverImage);
  const [coverAlt, setCoverAlt] = useState(post.coverAlt);
  const [authorName, setAuthorName] = useState(post.authorName);
  const [publishedAt, setPublishedAt] = useState(post.publishedAt);
  const [slug, setSlug] = useState(post.slug);
  const [savedSlug, setSavedSlug] = useState(post.slug);
  // The address follows the title until somebody edits it by hand.
  const [slugTouched, setSlugTouched] = useState(
    post.slug !== slugify(post.title) && !post.slug.startsWith('untitled'),
  );
  const [status, setStatus] = useState(post.status);
  const [everPublished, setEverPublished] = useState(post.everPublished);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [save, setSave] = useState<SaveStatus>({ kind: 'clean' });
  const [showChecks, setShowChecks] = useState(false);
  const [preview, setPreview] = useState<'closed' | 'desktop' | 'phone'>('closed');

  const revisionRef = useRef(0);
  const versionRef = useRef(post.version);
  const savingRef = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const live = status === 'published';
  const locked = everPublished;
  const date = parseDateInput(publishedAt);
  const scheduled = date !== null && date > new Date();
  const count = words(body);
  const minutes = Math.max(1, Math.round(count / 200));

  /** Any edit: marks the post changed and restarts the autosave wait. */
  const touch = () => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setDirty(true);
  };

  const changeTitle = (value: string) => {
    setTitle(value);
    if (!locked && !slugTouched) setSlug(slugify(value) || savedSlug);
    touch();
  };

  const checks = [
    { label: 'A title', done: title.trim().length >= 4, required: true },
    { label: 'A summary for the cards', done: excerpt.trim().length > 0, required: true },
    {
      label: `Enough to read (${count} ${count === 1 ? 'word' : 'words'})`,
      done: body.trim().length >= 200,
      required: true,
    },
    {
      label: coverImage ? 'The cover is described' : 'Cover: the standard illustration',
      done: !coverImage || coverAlt.trim().length > 0,
      required: true,
    },
    { label: 'At least one tag', done: tags.length > 0, required: false },
    {
      label: 'Summary short enough for search results',
      done: excerpt.trim().length > 0 && excerpt.trim().length <= SUMMARY_FITS,
      required: false,
    },
  ];
  const blockers = checks.filter((check) => check.required && !check.done);

  const runSave = useCallback(
    async (intent: SaveIntent) => {
      // One save at a time, so versions arrive in order. The buttons are
      // disabled meanwhile, and edits made during a save are picked up by the
      // next autosave.
      if (savingRef.current) return;
      savingRef.current = true;
      const startedAt = revisionRef.current;
      setSave({ kind: 'saving', intent });

      const data = new FormData();
      data.set('intent', intent);
      data.set('postId', post.id);
      data.set('version', versionRef.current);
      data.set('title', title);
      data.set('excerpt', excerpt);
      data.set('body', body);
      data.set('tags', tags.join(', '));
      data.set('coverImage', coverImage);
      data.set('coverAlt', coverAlt);
      data.set('authorName', authorName);
      data.set('publishedAt', publishedAt);
      data.set('slug', slug);

      let result: PostState;
      try {
        result = await savePost({ status: 'idle' }, data);
      } catch {
        result = {
          status: 'error',
          message: 'Could not reach the console. Your changes are still here; try again.',
        };
      }

      savingRef.current = false;
      if (result.status === 'done') {
        if (result.version) {
          versionRef.current = result.version;
        }
        if (result.published !== undefined) {
          setStatus(result.published ? 'published' : 'draft');
          if (result.published) setEverPublished(true);
        }
        if (result.slug && result.slug !== savedSlug) setSavedSlug(result.slug);
        if (revisionRef.current === startedAt) setDirty(false);
        setSave({ kind: 'saved', at: new Date(), message: intent === 'autosave' ? undefined : result.message });
      } else if (result.conflict) {
        setSave({ kind: 'conflict', message: result.message ?? 'Someone else saved this post.' });
      } else {
        setSave({ kind: 'error', message: result.message ?? 'That did not save.', field: result.field });
      }
    },
    [post.id, title, excerpt, body, tags, coverImage, coverAlt, authorName, publishedAt, slug, savedSlug],
  );

  // Drafts save themselves once typing stops. A live post never does.
  useEffect(() => {
    if (!dirty || live || save.kind === 'conflict') return;
    const timer = setTimeout(() => void runSave('autosave'), 2500);
    return () => clearTimeout(timer);
  }, [revision, dirty, live, save.kind, runSave]);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Cmd+S or Ctrl+S saves; Escape closes the preview.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void runSave('save');
      } else if (event.key === 'Escape') {
        setPreview('closed');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runSave]);

  // A new, empty post starts with the cursor in the title.
  useEffect(() => {
    if (!post.title) titleRef.current?.focus();
  }, [post.title]);

  const publish = () => {
    if (blockers.length > 0) {
      setShowChecks(true);
      setSave({ kind: 'error', message: `Before it can go live: ${blockers.map((b) => b.label.toLowerCase()).join(', ')}.` });
      return;
    }
    void runSave('publish');
  };

  const busy = save.kind === 'saving';
  const errorField = save.kind === 'error' ? save.field : undefined;
  const cover = coverImage
    ? { image: coverImage, alt: coverAlt }
    : coverForSlug(slug || savedSlug);

  return (
    <div className={styles.studio}>
      <div className={styles.bar}>
        <div className={styles.barStart}>
          <Link
            href="/posts"
            className={styles.back}
            onClick={(event) => {
              if (dirty && !window.confirm('Leave without saving your latest changes?')) {
                event.preventDefault();
              }
            }}
          >
            ← Journal
          </Link>
          <span className={`${forms.badge} ${live ? (scheduled ? forms.badgeWarn : forms.badgeGood) : ''}`}>
            {live ? (scheduled ? 'Scheduled' : 'Live') : 'Draft'}
          </span>
          <SaveLine save={save} dirty={dirty} live={live} />
        </div>
        <div className={styles.barActions}>
          <span className={styles.count}>
            {count} {count === 1 ? 'word' : 'words'} · {minutes} min read
          </span>
          <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setPreview('desktop')}>
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            Preview
          </button>
          {!live && (
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => void runSave('save')}
              disabled={busy}
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            className={forms.button}
            onClick={live ? () => void runSave('save') : publish}
            disabled={busy}
          >
            {live
              ? busy && save.intent !== 'autosave'
                ? 'Updating…'
                : 'Update'
              : busy && save.intent === 'publish'
                ? 'Publishing…'
                : scheduled
                  ? `Schedule for ${formatDate(date)}`
                  : 'Publish'}
          </button>
        </div>
      </div>

      {(save.kind === 'error' || save.kind === 'conflict') && (
        <p className={`${forms.error} ${styles.problem}`} role="alert">
          {save.message}
          {save.kind === 'conflict' && (
            <>
              {' '}
              <button type="button" className={forms.link} onClick={() => window.location.reload()}>
                Reload
              </button>
            </>
          )}
        </p>
      )}

      <div className={styles.layout}>
        <form
          className={styles.canvas}
          onSubmit={(event) => {
            event.preventDefault();
            void runSave('save');
          }}
        >
          <textarea
            ref={titleRef}
            className={styles.title}
            value={title}
            onChange={(event) => changeTitle(event.target.value.replace(/\n/g, ' '))}
            placeholder="Title"
            aria-label="Title"
            aria-invalid={errorField === 'title' || undefined}
            rows={1}
            maxLength={200}
          />
          <textarea
            className={styles.summary}
            value={excerpt}
            onChange={(event) => {
              setExcerpt(event.target.value.replace(/\n/g, ' '));
              touch();
            }}
            placeholder="A one or two sentence summary. It shows on the cards and in search results."
            aria-label="Summary"
            aria-invalid={errorField === 'excerpt' || undefined}
            rows={2}
            maxLength={400}
          />
          <div className={styles.body}>
            <RichText
              name="body"
              label="Body"
              profile="post"
              initialMarkdown={initialBody}
              onMarkdownChange={(markdown) => {
                if (markdown === body) return;
                setBody(markdown);
                touch();
              }}
              minHeight="tall"
              uploadImage={uploadWebsiteImage}
              hint="Headings, lists, quotes, links, code and images. The image button uploads a picture."
            />
          </div>
        </form>

        <aside className={styles.side} aria-label="Post settings">
          <Panel title="Publishing">
            <DateField
              name="publishedAt"
              label="Publish date"
              optional
              defaultValue={post.publishedAt}
              onChange={(value) => {
                setPublishedAt(value);
                touch();
              }}
              hint={
                live
                  ? 'Changing it re-dates the post.'
                  : 'Empty means the day you publish. A later date schedules it.'
              }
            />
            <Checklist checks={checks} open={showChecks || !live} />
            {live ? (
              <TakeDown
                postId={post.id}
                onDone={(result) => {
                  if (result.version) {
                    versionRef.current = result.version;
                  }
                  setStatus('draft');
                  setSave({ kind: 'saved', at: new Date(), message: result.message });
                }}
              />
            ) : (
              <Archive postId={post.id} />
            )}
          </Panel>

          <Panel title="Address">
            {locked ? (
              <p className={styles.address}>
                {SITE}/blog/<strong>{slug}</strong>
                <span className={forms.hint}>
                  Fixed now that it has been published, so links to it keep working.
                </span>
              </p>
            ) : (
              <div className={forms.field}>
                <div className={styles.slugRow}>
                  <span className={styles.slugPrefix}>/blog/</span>
                  <input
                    className={`${forms.control} ${styles.slugInput}`}
                    value={slug}
                    onChange={(event) => {
                      setSlug(slugify(event.target.value) || '');
                      setSlugTouched(true);
                      touch();
                    }}
                    aria-label="Address"
                    aria-invalid={errorField === 'slug' || undefined}
                    maxLength={120}
                  />
                </div>
                <p className={forms.hint}>
                  {slugTouched ? (
                    <>
                      Set by hand.{' '}
                      <button
                        type="button"
                        className={forms.link}
                        onClick={() => {
                          setSlugTouched(false);
                          setSlug(slugify(title) || savedSlug);
                          touch();
                        }}
                      >
                        Follow the title again
                      </button>
                    </>
                  ) : (
                    'Follows the title until the post is published.'
                  )}
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Cover">
            <CoverPicker
              coverImage={coverImage}
              coverAlt={coverAlt}
              fallback={coverForSlug(slug || savedSlug)}
              invalid={errorField === 'coverAlt' || errorField === 'coverImage'}
              onImage={(value) => {
                setCoverImage(value);
                if (!value) setCoverAlt('');
                touch();
              }}
              onAlt={(value) => {
                setCoverAlt(value);
                touch();
              }}
            />
          </Panel>

          <Panel title="Tags and byline">
            <TagInput
              tags={tags}
              suggestions={tagSuggestions}
              invalid={errorField === 'tags'}
              onChange={(next) => {
                setTags(next);
                touch();
              }}
            />
            <div className={forms.field}>
              <span className={forms.label} id={`${post.id}-byline`}>
                Byline
              </span>
              <Select
                aria-labelledby={`${post.id}-byline`}
                options={[...new Set([authorName, ...bylines])].map((name) => ({ value: name, label: name }))}
                value={authorName}
                onValueChange={(value) => {
                  setAuthorName(value);
                  touch();
                }}
                invalid={errorField === 'authorName'}
              />
            </div>
          </Panel>

          <Panel title="Search and sharing">
            <SearchPreview title={title} excerpt={excerpt} slug={slug || savedSlug} cover={cover} />
          </Panel>

          <details className={styles.history}>
            <summary>History</summary>
            {history}
          </details>
        </aside>
      </div>

      {preview !== 'closed' && (
        <div className={styles.previewBackdrop} role="dialog" aria-modal="true" aria-label="Preview">
          <div className={styles.previewBar}>
            <span className={styles.previewTitle}>
              Preview{dirty ? ', including changes not saved yet' : ''}
            </span>
            <div className={styles.previewSwitch} role="group" aria-label="Screen size">
              <button
                type="button"
                aria-pressed={preview === 'desktop'}
                onClick={() => setPreview('desktop')}
              >
                <Monitor size={16} strokeWidth={2} aria-hidden="true" />
                Desktop
              </button>
              <button type="button" aria-pressed={preview === 'phone'} onClick={() => setPreview('phone')}>
                <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
                Phone
              </button>
            </div>
            <button
              type="button"
              className={styles.previewClose}
              onClick={() => setPreview('closed')}
              aria-label="Close the preview"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.previewScroll}>
            <div className={`${styles.previewFrame} ${preview === 'phone' ? styles.previewPhone : ''}`}>
              <div className={blogStyles.main}>
                <BlogArticleView
                  preview
                  cover={cover}
                  post={{
                    title: title || 'Untitled',
                    excerpt,
                    author: authorName,
                    date: (date ?? new Date()).toISOString().slice(0, 10),
                    readingTime: minutes,
                    tags,
                    content: body,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SaveLine({ save, dirty, live }: { save: SaveStatus; dirty: boolean; live: boolean }) {
  let text: string;
  if (save.kind === 'saving') {
    text = save.intent === 'publish' ? 'Publishing…' : 'Saving…';
  } else if (save.kind === 'conflict' || save.kind === 'error') {
    text = 'Not saved';
  } else if (dirty) {
    text = live ? 'Changes not live yet' : 'Unsaved changes';
  } else if (save.kind === 'saved') {
    text = save.message ?? `Saved at ${save.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    text = live ? 'Live and up to date' : 'All changes saved';
  }
  return (
    <span className={styles.saveLine} role="status" aria-live="polite">
      {text}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function Checklist({
  checks,
  open,
}: {
  checks: { label: string; done: boolean; required: boolean }[];
  open: boolean;
}) {
  if (!open) return null;
  return (
    <ul className={styles.checks} aria-label="Ready to publish">
      {checks.map((check) => (
        <li key={check.label} className={check.done ? styles.checkDone : check.required ? styles.checkNeeded : ''}>
          {check.done ? (
            <Check size={15} strokeWidth={2.5} aria-hidden="true" />
          ) : check.required ? (
            <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Circle size={15} strokeWidth={2} aria-hidden="true" />
          )}
          <span>
            {check.label}
            {!check.required && !check.done && <span className={styles.optional}> (worth doing)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CoverPicker({
  coverImage,
  coverAlt,
  fallback,
  invalid,
  onImage,
  onAlt,
}: {
  coverImage: string;
  coverAlt: string;
  fallback: { image: string; alt: string };
  invalid: boolean;
  onImage: (value: string) => void;
  onAlt: (value: string) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const altId = useId();

  async function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    // A cover sits on a card beside other cards, and one that moves pulls
    // every eye on the page to itself. A GIF can still go inside the post.
    if (file.type === 'image/gif') {
      setStatus('A cover has to be a still image: JPG, PNG, WebP or AVIF.');
      return;
    }
    setBusy(true);
    setStatus(`Uploading ${file.name}…`);
    const result = await uploadWebsiteImage(file, (percent) => setStatus(`Uploading: ${percent}%`));
    setBusy(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    onImage(result.path);
    setStatus(coverAlt.trim() ? null : 'Uploaded. Now describe it for anyone who cannot see it.');
  }

  const shown = coverImage ? { image: coverImage, alt: coverAlt } : fallback;

  return (
    <div className={styles.cover}>
      <div className={styles.coverFrame}>
        <EditorialVisual src={shown.image} alt={shown.alt} fill sizes="22rem" className={styles.coverImage} />
      </div>
      <p className={forms.hint}>
        {coverImage ? 'Your image.' : 'The standard illustration for this address. Upload one to use your own.'}
      </p>
      <div className={styles.coverActions}>
        <label className={`${forms.button} ${forms.quiet} ${styles.upload}`} aria-disabled={busy}>
          {busy ? 'Uploading…' : coverImage ? 'Replace' : 'Upload a cover'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className={styles.fileInput}
            onChange={picked}
            disabled={busy}
          />
        </label>
        {coverImage && !busy && (
          <button type="button" className={forms.link} onClick={() => onImage('')}>
            Use the standard illustration
          </button>
        )}
      </div>
      {status && (
        <p className={forms.hint} role="status" aria-live="polite">
          {status}
        </p>
      )}
      {coverImage && (
        <div className={forms.field}>
          <label className={forms.label} htmlFor={altId}>
            Describe the cover
          </label>
          <input
            id={altId}
            className={forms.control}
            value={coverAlt}
            onChange={(event) => onAlt(event.target.value)}
            maxLength={300}
            aria-invalid={invalid || undefined}
            placeholder="What the picture shows"
          />
        </div>
      )}
    </div>
  );
}

function TagInput({
  tags,
  suggestions,
  invalid,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  invalid: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const listId = useId();
  const full = tags.length >= 8;

  const add = (value: string) => {
    const tag = value.trim().replace(/,+$/, '').slice(0, 40);
    if (!tag || full) return;
    // The existing spelling wins, so "ai" typed here becomes "AI" if that is
    // how the journal already writes it.
    const known = suggestions.find((existing) => existing.toLowerCase() === tag.toLowerCase());
    const chosen = known ?? tag;
    if (!tags.some((existing) => existing.toLowerCase() === chosen.toLowerCase())) {
      onChange([...tags, chosen]);
    }
    setDraft('');
  };

  const unused = suggestions.filter(
    (suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className={forms.field}>
      <label className={forms.label} htmlFor={inputId}>
        Tags
      </label>
      <div className={`${styles.tags} ${invalid ? styles.tagsInvalid : ''}`}>
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((existing) => existing !== tag))}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </span>
        ))}
        {!full && (
          <input
            id={inputId}
            list={listId}
            className={styles.tagInput}
            value={draft}
            onChange={(event) => {
              const value = event.target.value;
              if (value.endsWith(',')) add(value);
              else setDraft(value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add(draft);
              } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
                onChange(tags.slice(0, -1));
              }
            }}
            onBlur={() => add(draft)}
            placeholder={tags.length === 0 ? 'Product, AI, Tanzania' : 'Add a tag'}
            maxLength={40}
          />
        )}
        <datalist id={listId}>
          {unused.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </div>
      <p className={forms.hint}>
        {full ? 'Eight tags is the most a post takes.' : 'Press Enter or a comma after each one.'}
      </p>
      {unused.length > 0 && !full && (
        <div className={styles.suggestions}>
          {unused.slice(0, 6).map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => add(suggestion)}>
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPreview({
  title,
  excerpt,
  slug,
  cover,
}: {
  title: string;
  excerpt: string;
  slug: string;
  cover: { image: string; alt: string };
}) {
  const shown = title.trim() || 'Untitled';
  const cut = (value: string, limit: number) =>
    value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
  const titleLength = title.trim().length;
  const summaryLength = excerpt.trim().length;

  return (
    <div className={styles.search}>
      <div className={styles.result}>
        <span className={styles.resultUrl}>
          {SITE} › blog › {slug}
        </span>
        <span className={styles.resultTitle}>{cut(`${shown} | Ubunifu Technologies`, 64)}</span>
        <span className={styles.resultText}>
          {excerpt.trim() ? cut(excerpt.trim(), SUMMARY_FITS) : 'Search engines will pick a line from the post.'}
        </span>
      </div>
      <p className={styles.lengths}>
        <span className={titleLength > TITLE_FITS ? styles.over : ''}>
          Title {titleLength} of {TITLE_FITS}
        </span>
        <span className={summaryLength > SUMMARY_FITS ? styles.over : ''}>
          Summary {summaryLength} of {SUMMARY_FITS}
        </span>
      </p>

      <div className={styles.card}>
        <div className={styles.cardImage}>
          <EditorialVisual src={cover.image} alt="" fill sizes="22rem" className={styles.coverImage} />
        </div>
        <div className={styles.cardText}>
          <span className={styles.cardSite}>{SITE}</span>
          <span className={styles.cardTitle}>{shown}</span>
          {excerpt.trim() && <span className={styles.cardSummary}>{excerpt.trim()}</span>}
        </div>
      </div>
      <p className={forms.hint}>How a link to it looks when shared.</p>
    </div>
  );
}

function TakeDown({ postId, onDone }: { postId: string; onDone: (result: PostState) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className={`${forms.link} ${styles.quietAction}`} onClick={() => setOpen(true)}>
        Take it off the site
      </button>
    );
  }

  return (
    <div className={styles.confirm}>
      <p className={forms.hint}>It comes off the blog, the home page and the sitemap straight away.</p>
      <div className={styles.confirmActions}>
        <button
          type="button"
          className={`${forms.button} ${forms.danger}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const data = new FormData();
            data.set('postId', postId);
            data.set('publish', '');
            const result = await setPostStatus({ status: 'idle' }, data).catch(
              (): PostState => ({ status: 'error', message: 'Could not reach the console.' }),
            );
            setBusy(false);
            if (result.status === 'done') {
              setOpen(false);
              onDone(result);
            } else {
              setProblem(result.message ?? 'That did not work.');
            }
          }}
        >
          {busy ? 'Taking it down…' : 'Take it down'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(false)} disabled={busy}>
          Keep it live
        </button>
      </div>
      {problem && (
        <p className={forms.error} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

/** Archiving, behind a second press, so nothing irreversible is one click away. */
function Archive({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className={`${forms.link} ${styles.quietAction}`} onClick={() => setOpen(true)}>
        Archive this draft
      </button>
    );
  }

  return (
    <div className={styles.confirm}>
      <p className={forms.hint}>It leaves the journal. The post and its history are kept.</p>
      <div className={styles.confirmActions}>
        <button
          type="button"
          className={`${forms.button} ${forms.danger}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const data = new FormData();
            data.set('postId', postId);
            // Redirects to the journal when it works.
            const result = await archivePost({ status: 'idle' }, data);
            setBusy(false);
            if (result?.status === 'error') setProblem(result.message ?? 'That did not work.');
          }}
        >
          {busy ? 'Archiving…' : 'Archive it'}
        </button>
        <button type="button" className={`${forms.button} ${forms.quiet}`} onClick={() => setOpen(false)} disabled={busy}>
          Keep it
        </button>
      </div>
      {problem && (
        <p className={forms.error} role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
