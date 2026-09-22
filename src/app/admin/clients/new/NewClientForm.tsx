'use client';

import React, { useActionState, useId, useState } from 'react';
import { createClient, type NewClientState } from './actions';
import { DateField } from '@/components/console/Fields';
import forms from '@/styles/forms.module.css';
import { Select as ConsoleSelect, optionsFromChildren } from '@/components/console/Select';

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

const CURRENCIES = ['USD', 'TZS', 'EUR', 'GBP', 'KES'];

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
}: {
  templates: TemplateOption[];
  prefill?: Prefill;
}) {
  const [state, action, pending] = useActionState(createClient, INITIAL);
  const [startProject, setStartProject] = useState(true);
  const [serviceLine, setServiceLine] = useState(prefill?.serviceLine ?? 'web');
  const ids = useId();

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
    <form action={action} className={forms.form}>
      {/* Carried through the post so the enquiry can be marked converted and
          linked to the client in the same transaction that creates it. */}
      {prefill && <input type="hidden" name="enquiryId" value={prefill.enquiryId} />}

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueBrand}`}>The organisation</legend>
          <div className={forms.grid}>
            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor={field('name')}>
                Name
              </label>
              <input
                id={field('name')}
                name="name"
                defaultValue={was('name')}
                className={forms.control}
                required
                maxLength={160}
                autoComplete="organization"
                aria-invalid={invalid('name')}
              />
              <p className={forms.hint}>
                What they call themselves. Used everywhere a client sees their own name.
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
                Only if it differs. Contracts and invoices use this when it is set.
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
                    {code}
                  </option>
                ))}
              </Select>
              <p className={forms.hint}>Every invoice for this client is raised in it.</p>
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
                Email
              </label>
              <input
                id={field('contactEmail')}
                name="contactEmail"
                defaultValue={was('contactEmail', prefill?.contactEmail)}
                type="email"
                className={forms.control}
                required
                aria-invalid={invalid('contactEmail')}
              />
              <p className={forms.hint}>Their sign-in address. Everything we send goes here.</p>
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
                Phone or WhatsApp <span className={forms.optional}>(optional)</span>
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
                    still being prepared — you can send it from the client list at any time.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueAccent}`}>The first project</legend>

          <div className={forms.grid}>
            <div className={forms.wide}>
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
                    Turn this off to record the organisation alone — a contact you expect to work
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
                    defaultValue={was('projectName')}
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
                    A lead is somebody you have spoken to with nothing sent yet. Later stages are
                    reached by moving the project on, so the change is recorded.
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
                      ? 'No plan written for this service line yet. The project starts empty.'
                      : 'Fills in the phases, deliverables, the things you need from them, and the fee lines to be priced. All editable afterwards.'}
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

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Creating…' : 'Create client'}
          </button>
          <p className={forms.payoff}>
            {startProject
              ? 'Creates the organisation, the contact and the project together — or nothing at all if any part fails.'
              : 'Creates the organisation and the contact. You can add a project whenever one is agreed.'}
          </p>
        </div>

        {state.message && (
          <p className={forms.error} role="alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
