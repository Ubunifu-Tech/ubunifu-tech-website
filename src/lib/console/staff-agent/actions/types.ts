import 'server-only';
import type { StaffActor } from '@/lib/console/auth';
import type { Permission } from '@/lib/console/permissions';

/**
 * The shape of one thing the console assistant can ask to have done.
 *
 * An action is checked twice with the same function: once when the assistant
 * lays out a plan, so the person sees a plan that can actually be carried out,
 * and again when they confirm it, against the records as they stand by then.
 * Only `run` changes anything, and it only ever receives what `check` passed.
 */

/** A client as an action needs to know it. Ids are null while it is only planned. */
export type ClientFacts = {
  id: string | null;
  slug: string | null;
  name: string;
  currency: string;
  contact: {
    id: string | null;
    name: string;
    email: string | null;
    activatedAt: Date | null;
  } | null;
};

/** A project as an action needs to know it. Ids are null while it is only planned. */
export type ProjectFacts = {
  id: string | null;
  slug: string | null;
  name: string;
  currency: string;
  clientName: string;
  /** Names of the fees that count, including ones earlier steps will add. */
  feeLabels: string[];
};

/** What a step leaves behind for later steps to refer to as "step:N". */
export type Produced = { client?: ClientFacts; project?: ProjectFacts };

export type PlanEnv = {
  staff: StaffActor;
  /** A client by "step:N", slug or exact name. */
  client: (ref: unknown) => Promise<ClientFacts | string>;
  /** A project by "step:N", reference, slug or exact name. */
  project: (ref: unknown) => Promise<ProjectFacts | string>;
};

export type Checked<Value> =
  | {
      ok: true;
      value: Value;
      /** The record the step is about, as the review table names it. */
      subject: string;
      /** The rest of what the person is agreeing to, one fact per entry. */
      details: string[];
      produces?: Produced;
      /** Set when carrying the step out emails somebody outside the team. */
      sends?: string;
    }
  | { ok: false; message: string };

export type Ran = {
  /** What happened, in a few words, for the table and the activity record. */
  summary: string;
  /** Where to see it, as a console path. */
  href?: string;
  produces?: Produced;
};

export type PlanAction<Value = never> = {
  name: string;
  /** The verb phrase shown in the review table. */
  label: string;
  /** For the model: what it does and when to use it. */
  description: string;
  permission: Permission;
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  check: (input: Record<string, unknown>, env: PlanEnv) => Promise<Checked<Value>>;
  run: (value: Value, env: PlanEnv) => Promise<Ran>;
};

/** What the model sent for a field, as trimmed text. Numbers are accepted for amounts. */
export function text(value: unknown, max = 2000): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
