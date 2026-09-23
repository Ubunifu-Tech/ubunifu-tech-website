'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';
import { uploadedImageExists } from '@/lib/console/media';

export type WriterSummary = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  link: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
};

export type WriterState = {
  status: 'idle' | 'done' | 'error';
  message?: string;
  field?: string;
  /** The writer as saved, so the post editor can link to it at once. */
  writer?: WriterSummary;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds a writer, or changes one.
 *
 * Renaming a writer renames the byline on every post linked to them in the
 * same transaction, so an article never credits a spelling the writers list
 * no longer has. Their published articles are refreshed, because the role,
 * bio, link and photo are shown on them.
 */
export async function saveWriter(_previous: WriterState, formData: FormData): Promise<WriterState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const id = formText(formData, 'writerId');
  const name = formText(formData, 'name');
  const role = formText(formData, 'role');
  const bio = formText(formData, 'bio');
  const link = formText(formData, 'link');
  const photo = formText(formData, 'photo');
  const email = formText(formData, 'email').toLowerCase();
  const phone = formText(formData, 'phone');
  const notes = formText(formData, 'notes');

  if (name.length < 2 || name.length > 120) {
    return {
      status: 'error',
      message: 'Add their name as it should appear on articles.',
      field: 'name',
    };
  }
  if (role.length > 120)
    return { status: 'error', message: 'Keep the role to a line.', field: 'role' };
  if (bio.length > 600) {
    return { status: 'error', message: 'Keep the bio to two or three sentences.', field: 'bio' };
  }
  if (link) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(link);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== 'https:' || link.length > 300) {
      return {
        status: 'error',
        message: 'The link should be a full https:// address.',
        field: 'link',
      };
    }
  }
  if (photo && !(await uploadedImageExists(photo))) {
    return { status: 'error', message: 'Upload the photo again.', field: 'photo' };
  }
  if (email && (!EMAIL.test(email) || email.length > 254)) {
    return { status: 'error', message: 'That email address does not look right.', field: 'email' };
  }
  if (phone.length > 40)
    return { status: 'error', message: 'That phone number is too long.', field: 'phone' };
  if (notes.length > 2000)
    return { status: 'error', message: 'Those notes are too long.', field: 'notes' };

  const data = {
    name,
    role: role || null,
    bio: bio || null,
    link: link || null,
    photo: photo || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
  };
  const select = {
    id: true,
    name: true,
    role: true,
    bio: true,
    link: true,
    email: true,
    phone: true,
    photo: true,
  } as const;

  // One entry per person: a second "Asha Mushi" would split her articles
  // between two profiles.
  const sameName = await db.writer.findFirst({
    where: {
      deletedAt: null,
      name: { equals: name, mode: 'insensitive' },
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true, name: true },
  });
  if (sameName) {
    return { status: 'error', message: `${sameName.name} is already on the list.`, field: 'name' };
  }

  let writer: WriterSummary;
  let published: string[] = [];

  if (id) {
    const existing = await db.writer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) return { status: 'error', message: 'That writer is no longer in the list.' };

    const result = await db.$transaction(async (tx) => {
      // The same lock a post save takes before linking this writer, so a post
      // linked at this moment is either renamed here or reads the new name.
      await tx.$queryRaw`SELECT id FROM "Writer" WHERE id = ${id} FOR UPDATE`;
      const updated = await tx.writer.update({ where: { id }, data, select });
      if (existing.name !== name) {
        // Raw, so the posts' versions stay as they are: a rename is not an
        // edit to the article, and an editor open on one of them must not be
        // told somebody else saved it. That editor's next save takes the new
        // name from the writer.
        await tx.$executeRaw`UPDATE "Post" SET "authorName" = ${name} WHERE "writerId" = ${id}`;
      }
      const posts = await tx.post.findMany({
        where: { writerId: id, status: 'published', deletedAt: null },
        select: { slug: true },
      });
      return { updated, posts };
    });
    writer = result.updated;
    published = result.posts.map((post) => post.slug);
  } else {
    writer = await db.writer.create({ data, select });
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: id ? 'writer.updated' : 'writer.created',
    entityType: 'Writer',
    entityId: writer.id,
    summary: writer.name,
  });

  refresh(published);
  return { status: 'done', message: id ? 'Saved.' : `${writer.name} is on the list.`, writer };
}

/**
 * Takes a writer off the list. Kept rather than deleted, so the record of who
 * wrote what still resolves; their articles keep the byline and stop showing
 * the profile.
 */
export async function archiveWriter(
  _previous: WriterState,
  formData: FormData,
): Promise<WriterState> {
  const staff = await requireStaff();
  if (!can(staff, 'journal')) return { status: 'error', message: NO_PERMISSION };

  const id = formText(formData, 'writerId');
  const writer = await db.writer.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      posts: { where: { status: 'published', deletedAt: null }, select: { slug: true } },
    },
  });
  if (!writer) return { status: 'error', message: 'That writer is no longer in the list.' };

  await db.writer.update({ where: { id }, data: { deletedAt: new Date() } });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'writer.archived',
    entityType: 'Writer',
    entityId: writer.id,
    summary: writer.name,
  });

  refresh(writer.posts.map((post) => post.slug));
  redirect('/posts/writers');
}

/** The writers pages, and every live article that shows this writer. */
function refresh(slugs: string[]) {
  revalidatePath('/admin/posts/writers');
  if (slugs.length === 0) return;
  revalidatePath('/blog');
  revalidatePath('/');
  for (const slug of slugs) revalidatePath(`/blog/${slug}`);
}
