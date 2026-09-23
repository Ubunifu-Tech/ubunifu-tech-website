'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { formText } from '@/lib/console/form';

/**
 * A project's brand kit: its colours, and how type, layout and photos should
 * feel. It is what a design proposal promises, kept where the build can read
 * it and the client can see it.
 */

export type BrandState = { status: 'idle' | 'done' | 'error'; message?: string };

type Color = { name: string; hex: string; usage: string };

const HEX = /^#[0-9A-F]{6}$/;
const MAX_COLORS = 12;

/** "#3a1b06", "3A1B06" and "#3A1B06" are the same colour. */
function normaliseHex(value: string): string {
  const bare = value.trim().replace(/^#/, '').toUpperCase();
  return `#${bare}`;
}

function readColors(raw: string): Color[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || '[]');
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return parsed
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(row.name ?? '').trim(),
        hex: normaliseHex(String(row.hex ?? '')),
        usage: String(row.usage ?? '').trim(),
      };
    })
    .filter((color) => color.name || color.hex !== '#' || color.usage);
}

export async function saveBrandKit(_previous: BrandState, formData: FormData): Promise<BrandState> {
  const staff = await requireStaff();
  if (!can(staff, 'projects')) return { status: 'error', message: NO_PERMISSION };

  const project = await db.project.findFirst({
    where: { id: formText(formData, 'projectId'), deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!project) return { status: 'error', message: 'That project no longer exists.' };

  const colors = readColors(formText(formData, 'colors'));
  if (!colors) return { status: 'error', message: 'The colours could not be read. Try again.' };
  if (colors.length > MAX_COLORS) {
    return { status: 'error', message: `Keep it to ${MAX_COLORS} colours.` };
  }
  for (const [index, color] of colors.entries()) {
    const which = color.name || `Colour ${index + 1}`;
    if (!color.name || color.name.length > 60)
      return { status: 'error', message: `Name colour ${index + 1}.` };
    if (!HEX.test(color.hex)) {
      return { status: 'error', message: `${which} needs a six-digit code, like #3A1B06.` };
    }
    if (color.usage.length > 200)
      return { status: 'error', message: `Keep what ${which} is for short.` };
  }

  const text = {
    typography: formText(formData, 'typography'),
    principles: formText(formData, 'principles'),
    imageryDirection: formText(formData, 'imageryDirection'),
    notes: formText(formData, 'notes'),
  };
  if (Object.values(text).some((value) => value.length > 2000)) {
    return { status: 'error', message: 'Keep each note to a paragraph or two.' };
  }
  const fields = {
    typography: text.typography || null,
    principles: text.principles || null,
    imageryDirection: text.imageryDirection || null,
    notes: text.notes || null,
  };

  // The colours are rewritten as a set: their order is their position, and a
  // colour has no history worth keeping apart from the kit it belongs to.
  await db.$transaction(async (tx) => {
    const kit = await tx.brandKit.upsert({
      where: { projectId: project.id },
      update: fields,
      create: { projectId: project.id, ...fields },
      select: { id: true },
    });
    await tx.brandColor.deleteMany({ where: { kitId: kit.id } });
    if (colors.length > 0) {
      await tx.brandColor.createMany({
        data: colors.map((color, position) => ({
          kitId: kit.id,
          name: color.name,
          hex: color.hex,
          usage: color.usage || null,
          position,
        })),
      });
    }
  });

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: 'brand_kit.saved',
    entityType: 'Project',
    entityId: project.id,
    summary: `${colors.length} ${colors.length === 1 ? 'colour' : 'colours'}`,
  });

  revalidatePath(`/admin/projects/${project.slug}`);
  revalidatePath(`/portal/projects/${project.slug}`);
  return { status: 'done', message: 'Saved.' };
}
