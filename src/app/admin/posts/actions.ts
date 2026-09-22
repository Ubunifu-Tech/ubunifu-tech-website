'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireStaff, recordAudit } from '@/lib/console/auth';
import { formatDate, parseDateInput } from '@/lib/console/money';
import { slugify } from '@/lib/console/onboarding';

export type PostState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  field?: string;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Matches the rule the file-based blog enforced on frontmatter. */
const COVER_PATTERN = /^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:avif|jpe?g|png|webp)$/i;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
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

export async function createPost(
  _previous: PostState,
  formData: FormData,
): Promise<PostState> {
  const staff = await requireStaff();

  const title = text(formData, 'title');
  if (title.length < 4 || title.length > 200) {
    return { status: 'error', message: 'Give the post a title.', field: 'title' };
  }

  const wanted = text(formData, 'slug') || slugify(title);
  if (!SLUG_PATTERN.test(wanted)) {
    return {
      status: 'error',
      message: 'The address should be lowercase words separated by hyphens.',
      field: 'slug',
    };
  }

  const taken = await db.post.findUnique({ where: { slug: wanted }, select: { id: true } });
  if (taken) {
    return {
      status: 'error',
      message: 'A post already lives at that address. Choose another.',
      field: 'slug',
    };
  }

  const post = await db.post.create({
    data: {
      slug: wanted,
      title,
      excerpt: '',
      bodyMarkdown: '',
      authorId: staff.id,
      authorName: 'Ubunifu Technologies',
    },
    select: { id: true, slug: true },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'post.created',
    entityType: 'Post',
    entityId: post.id,
    summary: title,
  });

  revalidateBlog();
  redirect(`/posts/${post.slug}`);
}

/**
 * Saves a draft or an edit.
 *
 * A published post is edited in place rather than versioned, because a blog
 * post is not an agreement — nobody signs it and nobody needs to prove what it
 * said last week. What it does get is the same validation the frontmatter had,
 * so a post written here cannot be less complete than one committed as a file.
 */
export async function savePost(_previous: PostState, formData: FormData): Promise<PostState> {
  const staff = await requireStaff();

  const id = text(formData, 'postId');
  const post = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, status: true },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  const title = text(formData, 'title');
  const excerpt = text(formData, 'excerpt');
  const body = text(formData, 'body');
  const coverImage = text(formData, 'coverImage');
  const coverAlt = text(formData, 'coverAlt');
  const tags = text(formData, 'tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (title.length < 4 || title.length > 200) {
    return { status: 'error', message: 'Give the post a title.', field: 'title' };
  }
  if (excerpt.length > 400) {
    return { status: 'error', message: 'That summary is too long for a card.', field: 'excerpt' };
  }
  if (new Set(tags).size !== tags.length) {
    return { status: 'error', message: 'The same tag is in there twice.', field: 'tags' };
  }
  if (tags.length > 8) {
    return { status: 'error', message: 'Eight tags is plenty.', field: 'tags' };
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
      message: 'The cover should be a site path like /editorial/name.webp — avif, jpg, png or webp.',
      field: 'coverImage',
    };
  }

  // A published post has to stay publishable. setPostStatus refuses to put a
  // post live without a summary or with almost no body, but this used to let
  // a post that was ALREADY live be saved down to nothing — an empty card on
  // the home page, and an article with no article in it.
  if (post.status === 'published') {
    if (!excerpt) {
      return {
        status: 'error',
        message: 'This is live, so it needs a summary — that is what the cards show. Take it down first to clear it.',
        field: 'excerpt',
      };
    }
    if (body.length < 200) {
      return {
        status: 'error',
        message: 'This is live, and that would leave almost nothing on the page. Take it down first to rework it.',
      };
    }
  }

  const publishedOn = parseDateInput(text(formData, 'publishedAt'));

  await db.post.update({
    where: { id: post.id },
    data: {
      title,
      excerpt,
      bodyMarkdown: body,
      tags,
      coverImage: coverImage || null,
      coverAlt: coverAlt || null,
      ...(publishedOn ? { publishedAt: publishedOn } : {}),
    },
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'post.saved',
    entityType: 'Post',
    entityId: post.id,
    summary: title,
  });

  revalidateBlog(post.slug);
  return { status: 'done', message: 'Saved.' };
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
    },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  if (publish) {
    // The same fields the file-based blog required of frontmatter. A post
    // cannot go live less complete than one that was committed as a file.
    if (!post.excerpt.trim()) {
      return {
        status: 'error',
        message: 'It needs a summary before it can go live — that is what appears on the cards.',
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
    },
    select: { publishedAt: true },
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

  const id = text(formData, 'postId');
  const post = await db.post.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, title: true, status: true },
  });
  if (!post) return { status: 'error', message: 'That post no longer exists.' };

  if (post.status === 'published') {
    return {
      status: 'error',
      message: 'Take it down first — archiving should not be how something leaves the blog.',
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
