import 'server-only';
import { createClient, inviteContact } from './clients';
import { createProject } from './projects';
import { addFee, renameFee } from './fees';
import { createDocument } from './documents';
import { createInvoice } from './invoices';
import { remember } from './notes';
import type { PlanAction } from './types';

/**
 * Everything the console assistant can ask to have changed. This list is the
 * whole of it: an action that is not here cannot be planned, whatever a
 * conversation says. Sending a document or an invoice, recording a payment,
 * pausing or resuming a client's hosting and removing anything are left out on
 * purpose and stay with a person, on the screens that carry their checks. An
 * invoice can be drafted here and no more: issuing it is a person's step.
 */
export const PLAN_ACTIONS = [
  createClient,
  inviteContact,
  createProject,
  addFee,
  renameFee,
  createDocument,
  createInvoice,
  remember,
] as unknown as PlanAction<unknown>[];

export function planAction(name: unknown): PlanAction<unknown> | undefined {
  return PLAN_ACTIONS.find((action) => action.name === name);
}

export { StepRefused } from './clients';
export type { Checked, ClientFacts, PlanAction, PlanEnv, Produced, ProjectFacts, Ran } from './types';
