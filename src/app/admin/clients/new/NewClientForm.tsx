'use client';

import React, { useActionState, useId, useRef, useState } from 'react';
import { createClient, type NewClientState } from './actions';
import { DateField } from '@/components/console/Fields';
import { Steps } from '@/components/console/Steps';
import forms from '@/styles/forms.module.css';
import { Select as ConsoleSelect, optionsFromChildren } from '@/components/console/Select';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import { formatShortDate, parseDateInput } from '@/lib/console/money';

const INITIAL: NewClientState = { status: 'idle' };

export type TemplateOption = {
  id: string;
  name: string;
  serviceLine: string;
  description: string | null;
  isDefault: boolean;
};

/** What an enquiry already told us, when this form was opened from one. */
export type Prefill = {
  enquiryId: string;
  contactName: string;
  contactEmail: string;
  serviceLine: string;
  notes: string;
  /** What they wrote in about, as a first name for the project. */
  projectName: string;
};

const SERVICE_LINES: { value: string; label: string }[] = [
  { value: 'web', label: 'Websites & custom platforms' },
  { value: 'hosting', label: 'Hosting, domains & email' },
  { value: 'branding', label: 'Brand identity & design' },
  { value: 'data', label: 'Data & business intelligence' },
  { value: 'ai', label: 'AI & automation' },
  { value: 'strategy', label: 'Technology strategy & advisory' },
  { value: 'product', label: 'Product subscription' },
  { value: 'other', label: 'Something else' },
];

const ENGAGEMENTS: { value: string; label: string }[] = [
  { value: 'fixed_price_project', label: 'Fixed price project' },
  { value: 'retainer', label: 'Monthly retainer' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'support_only', label: 'Support only' },
];

const STATUSES: { value: string; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal_draft', label: 'Writing the proposal' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'proposal_accepted', label: 'Proposal accepted' },
];


const STEPS = [
  { key: 'organisation', label: 'Organisation' },
  { key: 'contact', label: 'Contact' },
  { key: 'project', label: 'First project' },
  { key: 'check', label: 'Check and create' },
];
const CHECK = STEPS.length - 1;

/** Which step each field is on, so an error from the server opens the right one. */
const FIELD_STEP: Record<string, number> = {
  name: 0,
  legalName: 0,
  website: 0,
  country: 0,
  currency: 0,
  notes: 0,
  contactName: 1,
  contactEmail: 1,
  contactRole: 1,
  contactPhone: 1,
  projectName: 2,
  serviceLine: 2,
  engagementType: 2,
  status: 2,
  templateId: 2,
  startDate: 2,
  targetDate: 2,
  summary: 2,
  ownerId: 2,
};

const labelOf = (list: { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value;

/** The shared dropdown, taking <option> children as this form was written. */
function Select({
  id,
  name,
  children,
  value,
  defaultValue,
  onChange,
  'aria-invalid': ariaInvalid,
}: {
  id: string;
  name: string;
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  'aria-invalid'?: boolean;
}) {
  return (
    <ConsoleSelect
      id={id}
      name={name}
      options={optionsFromChildren(children)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      invalid={ariaInvalid}
    />
  );
}

export function NewClientForm({
  templates,
  prefill,
  team,
  me,
  canStartProject,
}: {
  templates: TemplateOption[];
  prefill?: Prefill;
  /** Who can lead the first project: the people on the team who can sign in. */
  team: { id: string; name: string }[];
  /** Whoever is creating it, who leads it unless they choose someone else. */
  me: string;
  /** Whether this person may start projects, which is a separate permission. */
  canStartProject: boolean;
}) {
  const [state, action, pending] = useActionState(createClient, INITIAL);
  const [startProject, setStartProject] = useState(canStartProject);
  const [serviceLine, setServiceLine] = useState(prefill?.serviceLine ?? 'web');
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [review, setReview] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const sections = useRef<(HTMLDivElement | null)[]>([]);
  const ids = useId();

  // A problem the server found opens the step it is on. Done while rendering,
  // the first time each answer from the server is seen.
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.status === 'error') {
      setStep(state.field ? (FIELD_STEP[state.field] ?? CHECK) : CHECK);
    }
  }

  /** The first field on a step that the browser would refuse, if any. */
  const firstInvalid = (index: number) => {
    const section = sections.current[index];
    if (!section) return null;
    const fields = section.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    return [...fields].find((field) => !field.checkValidity()) ?? null;
  };

  /** Opens a step and shows the browser's own message on the field. */
  const point = (index: number, field: HTMLInputElement | HTMLTextAreaElement) => {
    setStep(index);
    requestAnimationFrame(() => field.reportValidity());
  };

  const open = (index: number) => {
    // Going back is always allowed. Going forward, every step on the way has
    // to be complete.
    for (let earlier = 0; earlier < Math.min(index, CHECK); earlier += 1) {
      const invalid = firstInvalid(earlier);
      if (invalid) return point(earlier, invalid);
    }
    if (index === CHECK && formRef.current) {
      const data = new FormData(formRef.current);
      setReview(
        Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value)])),
      );
    }
    setStep(index);
    setReached((furthest) => Math.max(furthest, index));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Enter in a field moves on a step. Only the last step creates anything.
    if (step < CHECK) {
      event.preventDefault();
      open(step + 1);
      return;
    }
    for (let index = 0; index < CHECK; index += 1) {
      const invalid = firstInvalid(index);
      if (invalid) {
        event.preventDefault();
        point(index, invalid);
        return;
      }
    }
  };

  const field = (name: string) => `${ids}-${name}`;
  const invalid = (name: string) => (state.field === name ? true : undefined);

  /**
   * React resets the form once the action returns, so after a validation error
   * every uncontrolled field falls back to its defaultValue. Pointing those
   * defaults at what was just submitted is what keeps the typing on screen.
   */
  const sent = state.values;
  const was = (name: keyof NonNullable<typeof sent>, fallback = '') =>
    sent ? String(sent[name] ?? '') : fallback;

  // Only the plans written for the chosen service line. A branding plan applied
  // to a hosting job would create phases nobody is going to run.
  const usable = templates.filter((template) => template.serviceLine === serviceLine);

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className={forms.form} noValidate>
      <Steps steps={STEPS} current={step} reachable={reached} onSelect={open} />

      {/* Carried through the post so the enquiry can be marked converted and
          linked to the client in the same transaction that creates it. */}
      {prefill && <input type="hidden" name="enquiryId" value={prefill.enquiryId} />}

      <div hidden={step !== 0} ref={(node) => { sections.current[0] = node; }}>
      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueBrand}`}>The organisation</legend>
          <div className={forms.grid}>
            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor={field('name')}>
                Name <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('name')}
                name="name"
                defaultValue={was('name')}
                className={forms.control}
                maxLength={160}
                autoComplete="organization"
                aria-invalid={invalid('name')}
              />
              <p className={forms.hint}>
                Leave blank for someone working on their own. Their name is used instead.
              </p>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('legalName')}>
                Registered name <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('legalName')}
                name="legalName"
                defaultValue={was('legalName')}
                className={forms.control}
                maxLength={200}
              />
              <p className={forms.hint}>
                Only if it differs. Agreements and invoices use this when it is set.
              </p>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('website')}>
                Website <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('website')}
                name="website"
                defaultValue={was('website')}
                type="url"
                className={forms.control}
                placeholder="https://"
                aria-invalid={invalid('website')}
              />
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('country')}>
                Country
              </label>
              <input
                id={field('country')}
                name="country"
                className={forms.control}
                defaultValue={was('country', 'TZ')}
                maxLength={2}
                required
                aria-invalid={invalid('country')}
              />
              <p className={forms.hint}>Two-letter code.</p>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('currency')}>
                Billing currency
              </label>
              <Select
                id={field('currency')}
                name="currency"
                defaultValue={was('currency', 'USD')}
                aria-invalid={invalid('currency')}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {currencyLabel(code)}
                  </option>
                ))}
              </Select>
              <p className={forms.hint}>Their projects are charged in it unless you choose another.</p>
            </div>

            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor={field('notes')}>
                Internal notes <span className={forms.optional}>(optional)</span>
              </label>
              <textarea
                id={field('notes')}
                name="notes"
                defaultValue={was('notes', prefill?.notes)}
                className={`${forms.control} ${forms.textarea}`}
                maxLength={2000}
              />
              <p className={forms.hint}>
                Never shown in the portal. How the conversation started, who introduced you, what
                they are worried about.
              </p>
            </div>
          </div>
        </fieldset>
      </div>
      </div>

      <div hidden={step !== 1} ref={(node) => { sections.current[1] = node; }}>
      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.huePrimary}`}>
            The person you deal with
          </legend>
          <div className={forms.grid}>
            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('contactName')}>
                Full name
              </label>
              <input
                id={field('contactName')}
                name="contactName"
                defaultValue={was('contactName', prefill?.contactName)}
                className={forms.control}
                required
                maxLength={120}
                aria-invalid={invalid('contactName')}
              />
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('contactEmail')}>
                Email <span className={forms.optional}>(if you have it)</span>
              </label>
              <input
                id={field('contactEmail')}
                name="contactEmail"
                defaultValue={was('contactEmail', prefill?.contactEmail)}
                type="email"
                className={forms.control}
                aria-invalid={invalid('contactEmail')}
              />
              <p className={forms.hint}>
                Their sign-in address. Without it, share a setup link from their client page, on
                WhatsApp say, and they add it themselves.
              </p>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('contactRole')}>
                Role <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('contactRole')}
                name="contactRole"
                defaultValue={was('contactRole')}
                className={forms.control}
                maxLength={120}
                placeholder="Founder, Operations Manager…"
              />
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('contactPhone')}>
                Phone <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('contactPhone')}
                name="contactPhone"
                defaultValue={was('contactPhone')}
                type="tel"
                className={forms.control}
                maxLength={40}
              />
            </div>

            <div className={forms.wide}>
              <label className={forms.checkRow} htmlFor={field('sendInvite')}>
                <input
                  id={field('sendInvite')}
                  name="sendInvite"
                  type="checkbox"
                  className={forms.check}
                  defaultChecked={sent ? sent.sendInvite : true}
                />
                <span className={forms.checkText}>
                  <span>Email them the invitation now</span>
                  <span className={forms.hint}>
                    They set their own password from the link. Leave this off while a project is
                    still being prepared. You can send it from the client page at any time.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </fieldset>
      </div>
      </div>

      <div hidden={step !== 2} ref={(node) => { sections.current[2] = node; }}>
      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueAccent}`}>The first project</legend>

          <div className={forms.grid}>
            {!canStartProject && (
              <p className={`${forms.hint} ${forms.wide}`}>
                Someone who runs projects can start their first project from the client&rsquo;s page.
              </p>
            )}
            <div className={forms.wide} hidden={!canStartProject}>
              <label className={forms.checkRow} htmlFor={field('startProject')}>
                <input
                  id={field('startProject')}
                  name="startProject"
                  type="checkbox"
                  className={forms.check}
                  checked={startProject}
                  onChange={(event) => setStartProject(event.target.checked)}
                />
                <span className={forms.checkText}>
                  <span>Start a project for them now</span>
                  <span className={forms.hint}>
                    Turn this off to record the organisation alone, for a contact you expect to work
                    with, but with nothing agreed yet.
                  </span>
                </span>
              </label>
            </div>

            {startProject && (
              <>
                <div className={`${forms.field} ${forms.wide}`}>
                  <label className={forms.label} htmlFor={field('projectName')}>
                    Project name
                  </label>
                  <input
                    id={field('projectName')}
                    name="projectName"
                    defaultValue={was('projectName', prefill?.projectName)}
                    className={forms.control}
                    maxLength={160}
                    aria-invalid={invalid('projectName')}
                  />
                  <p className={forms.hint}>
                    A reference like UBU-2026-004 is assigned automatically.
                  </p>
                </div>

                <div className={forms.field}>
                  <label className={forms.label} htmlFor={field('serviceLine')}>
                    Service line
                  </label>
                  <Select
                    id={field('serviceLine')}
                    name="serviceLine"
                    value={serviceLine}
                    onChange={setServiceLine}
                    aria-invalid={invalid('serviceLine')}
                  >
                    {SERVICE_LINES.map((line) => (
                      <option key={line.value} value={line.value}>
                        {line.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className={forms.field}>
                  <label className={forms.label} htmlFor={field('engagementType')}>
                    How it is billed
                  </label>
                  <Select
                    id={field('engagementType')}
                    name="engagementType"
                    defaultValue={was('engagementType', 'fixed_price_project')}
                    aria-invalid={invalid('engagementType')}
                  >
                    {ENGAGEMENTS.map((engagement) => (
                      <option key={engagement.value} value={engagement.value}>
                        {engagement.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className={forms.field}>
                  <label className={forms.label} htmlFor={field('ownerId')}>
                    Lead
                  </label>
                  <Select
                    id={field('ownerId')}
                    name="ownerId"
                    defaultValue={was('ownerId', me)}
                    aria-invalid={invalid('ownerId')}
                  >
                    <option value="">Nobody yet</option>
                    {team.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className={forms.field}>
                  <label className={forms.label} htmlFor={field('status')}>
                    Where it stands
                  </label>
                  <Select
                    id={field('status')}
                    name="status"
                    defaultValue={was('status', 'lead')}
                    aria-invalid={invalid('status')}
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                  <p className={forms.hint}>
                    Most projects start as a lead. Move them on from the project page.
                  </p>
                </div>

                <div className={forms.field}>
                  <label className={forms.label} htmlFor={field('templateId')}>
                    Plan
                  </label>
                  <Select
                    id={field('templateId')}
                    name="templateId"
                    key={serviceLine}
                    defaultValue={
                      sent ? sent.templateId : (usable.find((t) => t.isDefault)?.id ?? '')
                    }
                    aria-invalid={invalid('templateId')}
                  >
                    <option value="">Start empty</option>
                    {usable.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                  <p className={forms.hint}>
                    {usable.length === 0
                      ? 'There is no ready-made plan for this kind of work. It starts empty, and you add the phases on the Plan tab.'
                      : 'Adds a starting plan, what to ask them for, and fees to price. All editable.'}
                  </p>
                </div>

                <DateField
                  name="startDate"
                  label="Start date"
                  optional
                  defaultValue={was('startDate')}
                />

                <DateField
                  name="targetDate"
                  label="Target date"
                  optional
                  defaultValue={was('targetDate')}
                  invalid={invalid('targetDate')}
                />

                <div className={`${forms.field} ${forms.wide}`}>
                  <label className={forms.label} htmlFor={field('summary')}>
                    What the work is <span className={forms.optional}>(optional)</span>
                  </label>
                  <textarea
                    id={field('summary')}
                    name="summary"
                    defaultValue={was('summary')}
                    className={`${forms.control} ${forms.textarea}`}
                    maxLength={2000}
                  />
                  <p className={forms.hint}>A sentence or two. This one the client does see.</p>
                </div>
              </>
            )}
          </div>
        </fieldset>
      </div>
      </div>

      {step === CHECK && (
        <CheckStep
          values={review}
          startProject={startProject}
          templates={templates}
          onEdit={(index) => setStep(index)}
        />
      )}

      <div className={forms.card}>
        {state.message && (
          <p className={forms.error} role="alert">
            {state.message}
          </p>
        )}
        <div className={`${forms.actions} ${forms.actionsBare}`}>
          {step > 0 && (
            <button
              type="button"
              className={`${forms.button} ${forms.quiet}`}
              onClick={() => setStep(step - 1)}
              disabled={pending}
            >
              Back
            </button>
          )}
          {step < CHECK ? (
            <button type="submit" className={forms.button}>
              Continue
            </button>
          ) : (
            <button type="submit" className={forms.button} disabled={pending}>
              {pending ? 'Creating…' : 'Create client'}
            </button>
          )}
          <p className={forms.payoff}>
            {step < CHECK
              ? `Step ${step + 1} of ${STEPS.length}. Nothing is saved until the last step.`
              : startProject
                ? 'Creates the client, their contact and the project.'
                : canStartProject
                  ? 'Creates the organisation and the contact. You can add a project whenever one is agreed.'
                  : 'Creates the organisation and the contact.'}
          </p>
        </div>
      </div>
    </form>
  );
}

/** Everything entered, grouped as it was asked for, with a way back to each part. */
function CheckStep({
  values,
  startProject,
  templates,
  onEdit,
}: {
  values: Record<string, string>;
  startProject: boolean;
  templates: TemplateOption[];
  onEdit: (step: number) => void;
}) {
  const v = (key: string) => values[key]?.trim() ?? '';
  const plan = templates.find((template) => template.id === v('templateId'));

  const groups: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 0,
      title: 'Organisation',
      rows: [
        ['Name', v('name') || `${v('contactName') || 'The contact'}, working on their own`],
        ['Registered name', v('legalName')],
        ['Website', v('website')],
        ['Country', v('country').toUpperCase()],
        ['Billing currency', currencyLabel(v('currency'))],
        ['Internal notes', v('notes')],
      ],
    },
    {
      step: 1,
      title: 'Contact',
      rows: [
        ['Name', v('contactName')],
        ['Email', v('contactEmail') || 'They add it from their setup link'],
        ['Role', v('contactRole')],
        ['Phone', v('contactPhone')],
        [
          'Portal invitation',
          !v('contactEmail')
            ? 'A setup link to share yourself, from their client page'
            : values.sendInvite
              ? 'Emailed when you create the client'
              : 'Not sent yet',
        ],
      ],
    },
    {
      step: 2,
      title: 'First project',
      rows: startProject
        ? [
            ['Name', v('projectName') || 'Not named yet'],
            ['Service', labelOf(SERVICE_LINES, v('serviceLine'))],
            ['Billed as', labelOf(ENGAGEMENTS, v('engagementType'))],
            ['Stage', labelOf(STATUSES, v('status'))],
            ['Plan', plan?.name ?? 'Start empty'],
            ['Start', v('startDate') ? formatShortDate(parseDateInput(v('startDate'))) : ''],
            ['Target', v('targetDate') ? formatShortDate(parseDateInput(v('targetDate'))) : ''],
            ['What the work is', v('summary')],
          ]
        : [['Project', 'None for now']],
    },
  ];

  return (
    <div className={forms.card}>
      <div className={forms.review}>
        {groups.map((group) => (
          <section key={group.title} className={forms.reviewGroup}>
            <div className={forms.reviewHead}>
              <h2 className={forms.cardTitle}>{group.title}</h2>
              <button type="button" className={forms.link} onClick={() => onEdit(group.step)}>
                Change
              </button>
            </div>
            <dl className={forms.reviewList}>
              {group.rows
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className={forms.reviewRow}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
