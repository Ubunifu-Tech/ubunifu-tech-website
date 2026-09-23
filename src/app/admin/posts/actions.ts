'use server';

import { NO_PERMISSION } from '@/lib/console/permissions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, requireStaff, recordAudit } from '@/lib/console/auth';
import { formatDate, parseDateInput } from '@/lib/console/money';
import { SLUG_PATTERN } from '@/lib/slug';
import { parseMediaFile } from '@/lib/console/media';
import { formText } from '@/lib/console/form';
import { isUniqueConflict } from '@/lib/console/conflict';

export type PostState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  field?: string;
  /**
   * The post's version after this change. The editor sends it back with the
   * next save, and a save made against an older version is refused rather
   * than written over somebody else's.
   */
  version?: string;
  /** The address the post now lives at, which can change while it is a draft. */
  slug?: string;
  published?: boolean;
  /** Somebody else saved the post since this editor loaded it. */
  conflict?: boolean;
};

export type SaveIntent = 'autosave' | 'save' | 'publish';

/** The byline when nobody chooses one. */
const COMPANY = 'Ubunifu Technologies';
/** Matches the rule the file-based blog enforced on frontmatter. */
const COVER_PATTERN = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:avif|jpe?g|png|webp)$/i;

function text(formData: FormData, key: string): string {
  return formText(formData, key);
}

/**
 * Revalidates everywhere a post is visible.
 *
 * The blog index, the post itself, the home page — which shows the three most
 * recent — and the sitemap. Forgetting one of these is how a published post
 * appears on its own page and nowhere else.
 */
function revalidateBlog(slug?: string) {
  revalidatePath('/blog');
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/admin/posts');
}

/**
 * A new, empty draft, opened straight away.
 *
 * Nothing is asked first: the editor is where a post is written, and a title
 * typed there names the address too, until the post is first published.
 */
export async function startPost(): Promise<void> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) redirect('/no-access');

  let post: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 5 && !post; attempt += 1) {
    const slug = await freeSlug('untitled');
    try {
      post = await db.post.create({
        data: {
          slug,
          title: '',
          excerpt: '',
          bodyMarkdown: '',
          authorId: staff.id,
          authorName: COMPANY,
        },
        select: { id: true, slug: true },
      });
    } catch (error) {
      // Two drafts started in the same instant can pick the same address.
      if (!isUniqueConflict(error)) throw error;
    }
  }
  if (!post) throw new Error('Could not find a free address for a new post.');

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'post.created',
    entityType: 'Post',
    entityId: post.id,
    summary: 'New draft',
  });

  revalidatePath('/admin/posts');
  redirect(`/posts/${post.id}`);
}

/** The first free address at or after this one: base, base-2, base-3… */
async function freeSlug(base: string, exceptId?: string): Promise<string> {
  const root = base || 'untitled';
  for (let suffix = 1; suffix < 200; suffix += 1) {
    const candidate = suffix === 1 ? root : `${root.slice(0, 56)}-${suffix}`;
    const taken = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken || taken.id === exceptId) return candidate;
  }
  return `${root.slice(0, 50)}-${Date.now().toString(36)}`;
}

/**
 * Saves the editor: an autosave of a draft, a save, or a save that publishes.
 *
 * A published post is edited in place rather than versioned, because a blog
 * post is not an agreement: nobody signs it and nobody needs to prove what it
 * said last week. What it does get is the same validation the frontmatter had,
 * so a post written here cannot be less complete than one committed as a file.
 *
 * Publishing goes through here too, so what goes live is what is on the
 * screen, not whatever was saved last.
 *
 * Every save carries the version the editor loaded. The write only happens if
 * the row is still at that version, so two people with the same post open
 * cannot silently overwrite each other; the second is told instead.
 */
export async function savePost(_previous: PostState, formData: FormData): Promise<PostState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const intentValue = text(formData, 'intent');
  const intent: SaveIntent =
    intentValue === 'autosave' || intentValue === 'publish' ? intentValue : 'save';

  const id = text(formData, 'postId');
  const post = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      firstPublishedAt: true,
      updatedAt: true,
    },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  const version = text(formData, 'version');
  if (version && version !== post.updatedAt.toISOString()) return conflict();

  const title = text(formData, 'title');
  const excerpt = text(formData, 'excerpt');
  const body = text(formData, 'body');
  const coverImage = text(formData, 'coverImage');
  const coverAlt = text(formData, 'coverAlt');
  const authorName = text(formData, 'authorName') || COMPANY;
  const tags = text(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const live = post.status === 'published';
  const goingLive = intent === 'publish' || live;

  // A draft can be saved with no title while it is being written; anything
  // that is, or is about to be, on the site needs one.
  if (title.length > 200 || (goingLive && title.length < 4)) {
    return { status: 'error', message: 'Give the post a title.', field: 'title' };
  }
  if (excerpt.length > 400) {
    return { status: 'error', message: 'That summary is too long for a card.', field: 'excerpt' };
  }
  if (authorName.length < 2 || authorName.length > 120) {
    return { status: 'error', message: 'Choose who the byline names.', field: 'authorName' };
  }
  if (new Set(tags.map((tag) => tag.toLowerCase())).size !== tags.length) {
    return { status: 'error', message: 'The same tag is in there twice.', field: 'tags' };
  }
  if (tags.length > 8) {
    return { status: 'error', message: 'Eight tags is plenty.', field: 'tags' };
  }
  if (tags.some((tag) => tag.length > 40)) {
    return { status: 'error', message: 'Keep each tag to a few words.', field: 'tags' };
  }

  // Both or neither: a cover with no description is an image a screen reader
  // cannot announce, and a description with no image is nothing.
  if ((coverImage && !coverAlt) || (!coverImage && coverAlt)) {
    return {
      status: 'error',
      message: 'A cover needs both an image and a description of it.',
      field: 'coverAlt',
    };
  }
  if (coverImage && !COVER_PATTERN.test(coverImage)) {
    return {
      status: 'error',
      message: 'The cover should be a site path like /editorial/name.webp: avif, jpg, png or webp.',
      field: 'coverImage',
    };
  }

  // An uploaded image's address passes the pattern whether or not the image
  // exists, so a mistyped or since-removed one would be saved and then shown
  // on the live site as a broken picture. Check it is really there.
  if (coverImage.startsWith('/media/')) {
    const file = parseMediaFile(coverImage);
    const exists =
      file &&
      (await db.mediaAsset.findFirst({
        where: { id: file.id, extension: file.extension, deletedAt: null },
        select: { id: true },
      }));
    if (!exists) {
      return {
        status: 'error',
        message: 'There is no uploaded image at that address. Upload it again, or clear the field.',
        field: 'coverImage',
      };
    }
  }

  // Anything on the site has to stay worth reading: a summary for the cards,
  // and more than a line of body.
  if (goingLive) {
    if (!excerpt) {
      return {
        status: 'error',
        message: live
          ? 'This is live, so it needs a summary. That is what the cards show.'
          : 'Write a summary before publishing. That is what the cards show.',
        field: 'excerpt',
      };
    }
    if (body.length < 200) {
      return {
        status: 'error',
        message: live
          ? 'This is live, and that would leave almost nothing on the page. Take it down first to rework it.'
          : 'There is not enough here to publish yet.',
        field: 'body',
      };
    }
  }

  // The address follows the post until the first time it is published. After
  // that people may have the link, so it stays put.
  let slug = post.slug;
  const wantedSlug = text(formData, 'slug');
  if (!post.firstPublishedAt && wantedSlug && wantedSlug !== post.slug) {
    if (!SLUG_PATTERN.test(wantedSlug) || wantedSlug.length > 120) {
      return {
        status: 'error',
        message: 'The address should be lowercase words separated by hyphens.',
        field: 'slug',
      };
    }
    const taken = await db.post.findUnique({ where: { slug: wantedSlug }, select: { id: true } });
    if (taken && taken.id !== post.id) {
      return {
        status: 'error',
        message: 'Another post already lives at that address. Choose another.',
        field: 'slug',
      };
    }
    slug = wantedSlug;
  }

  const now = new Date();
  const chosenDate = parseDateInput(text(formData, 'publishedAt'));
  const publishedAt =
    chosenDate ?? (intent === 'publish' && !post.publishedAt ? now : post.publishedAt);

  let updated: { updatedAt: Date; publishedAt: Date | null; status: string };
  try {
    // Written only if nobody has saved since this editor loaded the post.
    const written = await db.post.updateMany({
      where: { id: post.id, updatedAt: post.updatedAt, deletedAt: null },
      data: {
        title,
        excerpt,
        bodyMarkdown: body,
        tags,
        authorName,
        coverImage: coverImage || null,
        coverAlt: coverAlt || null,
        slug,
        publishedAt,
        ...(intent === 'publish'
          ? { status: 'published' as const, firstPublishedAt: post.firstPublishedAt ?? now }
          : {}),
      },
    });
    if (written.count === 0) return conflict();
    updated = await db.post.findUniqueOrThrow({
      where: { id: post.id },
      select: { updatedAt: true, publishedAt: true, status: true },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        status: 'error',
        message: 'Another post took that address a moment ago. Choose another.',
        field: 'slug',
      };
    }
    throw error;
  }

  const scheduledFor =
    updated.status === 'published' && updated.publishedAt && updated.publishedAt > now
      ? updated.publishedAt
      : null;

  // Autosaves are not recorded one by one; the record would be nothing else.
  if (intent !== 'autosave') {
    await recordAudit({
      actorType: 'staff',
      actorId: staff.id,
      action:
        intent === 'publish' && !live
          ? scheduledFor
            ? 'post.scheduled'
            : 'post.published'
          : 'post.saved',
      entityType: 'Post',
      entityId: post.id,
      summary: title || 'Untitled draft',
    });
  }

  if (goingLive) {
    revalidateBlog(slug);
    if (slug !== post.slug) revalidatePath(`/blog/${post.slug}`);
  } else {
    revalidatePath('/admin/posts');
  }

  return {
    status: 'done',
    message:
      intent === 'publish' && !live
        ? scheduledFor
          ? `Scheduled. It goes live on ${formatDate(scheduledFor)}.`
          : 'Published. It is live now.'
        : live
          ? 'Saved. The live post has changed.'
          : 'Saved.',
    version: updated.updatedAt.toISOString(),
    slug,
    published: updated.status === 'published',
  };
}

function conflict(): PostState {
  return {
    status: 'error',
    conflict: true,
    message:
      'Someone else saved this post after you opened it. Your changes are still on screen: copy what you need, then reload to see theirs.',
  };
}

/**
 * Publishing and unpublishing.
 *
 * A post is only live when it is published AND its date has passed, so setting
 * a future date schedules it. Unpublishing takes it off the site immediately —
 * the pages are revalidated here rather than waiting for a rebuild.
 */
export async function setPostStatus(
  _previous: PostState,
  formData: FormData,
): Promise<PostState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const id = text(formData, 'postId');
  const publish = formData.get('publish') === 'on';

  const post = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      bodyMarkdown: true,
      publishedAt: true,
      firstPublishedAt: true,
    },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  if (publish) {
    // The same fields the file-based blog required of frontmatter. A post
    // cannot go live less complete than one that was committed as a file.
    if (post.title.trim().length < 4) {
      return { status: 'error', message: 'Give it a title before it goes live.' };
    }
    if (!post.excerpt.trim()) {
      return {
        status: 'error',
        message: 'It needs a summary before it can go live. That is what appears on the cards.',
      };
    }
    if (post.bodyMarkdown.trim().length < 200) {
      return { status: 'error', message: 'There is not enough here to publish yet.' };
    }
  }

  const now = new Date();
  const updated = await db.post.update({
    where: { id: post.id },
    data: {
      status: publish ? 'published' : 'draft',
      // Dated on first publish and never moved afterwards, so unpublishing to
      // fix a typo does not re-date the piece.
      ...(publish && !post.publishedAt ? { publishedAt: now } : {}),
      ...(publish && !post.firstPublishedAt ? { firstPublishedAt: now } : {}),
    },
    select: { publishedAt: true, updatedAt: true },
  });
  // Published with a date still ahead of us is scheduled, not live, and the
  // message has to say which — "It is live now" about a post nobody can see
  // yet is the kind of sentence that sends someone to share a dead link.
  const scheduledFor =
    publish && updated.publishedAt && updated.publishedAt > now ? updated.publishedAt : null;

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: !publish ? 'post.unpublished' : scheduledFor ? 'post.scheduled' : 'post.published',
    entityType: 'Post',
    entityId: post.id,
    summary: post.title,
  });

  revalidateBlog(post.slug);
  return {
    status: 'done',
    message: !publish
      ? 'Taken down. It is off the site.'
      : scheduledFor
        ? `Scheduled. It goes live on ${formatDate(scheduledFor)}.`
        : 'Published. It is live now.',
    version: updated.updatedAt.toISOString(),
    published: publish,
  };
}

/**
 * Archiving.
 *
 * A soft delete: the row stays, so the audit trail still points at something
 * and a slug somebody bookmarked is not quietly handed to a different post.
 * It refuses while the post is published, because archiving something that is
 * live would take it off the blog as a side effect of a different intention —
 * taking it down is its own decision and it gets its own audit line.
 */
export async function archivePost(_previous: PostState, formData: FormData): Promise<PostState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const id = text(formData, 'postId');
  const post = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, title: true, status: true },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  if (post.status === 'published') {
    return {
      status: 'error',
      message: 'Take it down first, then archive it.',
    };
  }

  await db.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'post.archived',
    entityType: 'Post',
    entityId: post.id,
    summary: post.title,
  });

  revalidateBlog(post.slug);
  redirect('/posts');
}
