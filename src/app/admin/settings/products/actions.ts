'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { can, recordAudit, requireStaff } from '@/lib/console/auth';
import { NO_PERMISSION } from '@/lib/console/permissions';
import { formText } from '@/lib/console/form';
import { isUniqueConflict } from '@/lib/console/conflict';

export type ProductState = { status: 'idle' | 'done' | 'error'; message?: string };

function refresh() {
  revalidatePath('/admin/settings/products');
  revalidatePath('/admin/finance', 'layout');
}

/** A new product, or a new name for one. */
export async function saveProduct(_previous: ProductState, formData: FormData): Promise<ProductState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const name = formText(formData, 'name').slice(0, 80);
  if (name.length < 2) return { status: 'error', message: 'Give it a name.' };
  const productId = formText(formData, 'productId');
  const taken = await db.product.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(productId ? { NOT: { id: productId } } : {}),
    },
    select: { id: true },
  });
  if (taken) return { status: 'error', message: 'There is already a product called that.' };

  let saved: { id: string };
  try {
    saved = productId
      ? await db.product.update({ where: { id: productId }, data: { name }, select: { id: true } })
      : await db.product.create({ data: { name }, select: { id: true } });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: 'error', message: 'There is already a product called that.' };
    if ((error as { code?: string }).code === 'P2025') {
      return { status: 'error', message: 'That product no longer exists.' };
    }
    throw error;
  }

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: productId ? 'product.renamed' : 'product.added',
    entityType: 'Product',
    entityId: saved.id,
    summary: name,
  });
  refresh();
  return { status: 'done', message: productId ? 'Saved.' : `${name} added.` };
}

/**
 * Stops offering a product in the forms, or brings it back. Its money stays
 * in the reports either way.
 */
export async function setProductActive(
  _previous: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const staff = await requireStaff();
  if (!can(staff, 'finance')) return { status: 'error', message: NO_PERMISSION };

  const isActive = formText(formData, 'active') === 'on';
  const product = await db.product
    .update({
      where: { id: formText(formData, 'productId') },
      data: { isActive },
      select: { id: true, name: true },
    })
    .catch(() => null);
  if (!product) return { status: 'error', message: 'That product no longer exists.' };

  await recordAudit({
    actorType: 'staff',
    actorId: staff.id,
    action: isActive ? 'product.restarted' : 'product.stopped',
    entityType: 'Product',
    entityId: product.id,
    summary: product.name,
  });
  refresh();
  return { status: 'done', message: isActive ? 'Offered again.' : 'Stopped.' };
}
