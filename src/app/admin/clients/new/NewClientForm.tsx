'use client';

import React, { useActionState, useId, useState } from 'react';
import { createClient, type NewClientState } from './actions';
import styles from '../../Admin.module.css';

const INITIAL: NewClientState = { status: 'idle' };

export type TemplateOption = {
  id: string;
  name: string;
  serviceLine: string;
  description: string | null;
  isDefault: boolean;
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
  { value: 'lead', label: 'Lead — we have spoken, nothing sent' },
  { value: 'proposal_draft', label: 'Writing the proposal' },
  { value: 'proposal_sent', label: 'Proposal sent, waiting' },
  { value: 'proposal_accepted', label: 'Proposal accepted' },
];

const CURRENCIES = ['USD', 'TZS', 'EUR', 'GBP', 'KES'];

export function NewClientForm({ templates }: { templates: TemplateOption[] }) {
  const [state, action, pending] = useActionState(createClient, INITIAL);
  const [startProject, setStartProject] = useState(true);
  const [serviceLine, setServiceLine] = useState('web');
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
    <form action={action} className={`${styles.form} ${styles.recordForm}`}>
      <fieldset className={styles.group}>
        <legend className={`${styles.groupTitle} ${styles.groupOrg}`}>The organisation</legend>
        <div className={styles.fields}>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label className={styles.label} htmlFor={field('name')}>
              Name
            </label>
            <input
              id={field('name')}
              name="name"
              defaultValue={was('name')}
              className={styles.input}
              required
              maxLength={160}
              autoComplete="organization"
              aria-invalid={invalid('name')}
            />
            <p className={styles.hint}>What they call themselves. Used everywhere a client sees their own name.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('legalName')}>
              Registered name (optional)
            </label>
            <input
              id={field('legalName')}
              name="legalName"
              defaultValue={was('legalName')}
              className={styles.input}
              maxLength={200}
            />
            <p className={styles.hint}>Only if it differs. Contracts and invoices use this when it is set.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('website')}>
              Website (optional)
            </label>
            <input
              id={field('website')}
              name="website"
              defaultValue={was('website')}
              type="url"
              className={styles.input}
              placeholder="https://"
              aria-invalid={invalid('website')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('country')}>
              Country
            </label>
            <input
              id={field('country')}
              name="country"
              className={styles.input}
              defaultValue={was('country', 'TZ')}
              maxLength={2}
              required
              aria-invalid={invalid('country')}
            />
            <p className={styles.hint}>Two-letter code.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('currency')}>
              Billing currency
            </label>
            <select
              id={field('currency')}
              name="currency"
              className={styles.select}
              defaultValue={was('currency', 'USD')}
              aria-invalid={invalid('currency')}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className={styles.hint}>Every invoice for this client is raised in it.</p>
          </div>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label className={styles.label} htmlFor={field('notes')}>
              Internal notes (optional)
            </label>
            <textarea
              id={field('notes')}
              name="notes"
              defaultValue={was('notes')}
              className={styles.textarea}
              maxLength={2000}
            />
            <p className={styles.hint}>Never shown in the portal. How the conversation started, who introduced you, what they are worried about.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={`${styles.groupTitle} ${styles.groupContact}`}>The person you deal with</legend>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('contactName')}>
              Full name
            </label>
            <input
              id={field('contactName')}
              name="contactName"
              defaultValue={was('contactName')}
              className={styles.input}
              required
              maxLength={120}
              aria-invalid={invalid('contactName')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('contactEmail')}>
              Email
            </label>
            <input
              id={field('contactEmail')}
              name="contactEmail"
              defaultValue={was('contactEmail')}
              type="email"
              className={styles.input}
              required
              aria-invalid={invalid('contactEmail')}
            />
            <p className={styles.hint}>Their sign-in address. Everything we send goes here.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('contactRole')}>
              Role (optional)
            </label>
            <input
              id={field('contactRole')}
              name="contactRole"
              defaultValue={was('contactRole')}
              className={styles.input}
              maxLength={120}
              placeholder="Founder, Operations Manager…"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={field('contactPhone')}>
              Phone or WhatsApp (optional)
            </label>
            <input
              id={field('contactPhone')}
              name="contactPhone"
              defaultValue={was('contactPhone')}
              type="tel"
              className={styles.input}
              maxLength={40}
            />
          </div>

          <div className={styles.fieldWide}>
            <label className={styles.toggle} htmlFor={field('sendInvite')}>
              <input
                id={field('sendInvite')}
                name="sendInvite"
                type="checkbox"
                className={styles.toggleInput}
                defaultChecked={sent ? sent.sendInvite : true}
              />
              <span className={styles.toggleText}>
                <span>Email them the invitation now</span>
                <span className={styles.hint}>
                  They set their own password from the link. Leave this off while a project is
                  still being prepared — you can send it from the client list at any time.
                </span>
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={`${styles.groupTitle} ${styles.groupProject}`}>The first project</legend>

        <div className={styles.fields}>
          <div className={styles.fieldWide}>
            <label className={styles.toggle} htmlFor={field('startProject')}>
              <input
                id={field('startProject')}
                name="startProject"
                type="checkbox"
                className={styles.toggleInput}
                checked={startProject}
                onChange={(event) => setStartProject(event.target.checked)}
              />
              <span className={styles.toggleText}>
                <span>Start a project for them now</span>
                <span className={styles.hint}>
                  Turn this off to record the organisation alone — a contact you expect to work
                  with, but with nothing agreed yet.
                </span>
              </span>
            </label>
          </div>

          {startProject && (
            <>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.label} htmlFor={field('projectName')}>
                  Project name
                </label>
                <input
                  id={field('projectName')}
                  name="projectName"
              defaultValue={was('projectName')}
                  className={styles.input}
                  maxLength={160}
                  aria-invalid={invalid('projectName')}
                />
                <p className={styles.hint}>A reference like UBU-2026-004 is assigned automatically.</p>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('serviceLine')}>
                  Service line
                </label>
                <select
                  id={field('serviceLine')}
                  name="serviceLine"
                  className={styles.select}
                  value={serviceLine}
                  onChange={(event) => setServiceLine(event.target.value)}
                  aria-invalid={invalid('serviceLine')}
                >
                  {SERVICE_LINES.map((line) => (
                    <option key={line.value} value={line.value}>
                      {line.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('engagementType')}>
                  How it is billed
                </label>
                <select
                  id={field('engagementType')}
                  name="engagementType"
                  className={styles.select}
                  defaultValue={was('engagementType', 'fixed_price_project')}
                  aria-invalid={invalid('engagementType')}
                >
                  {ENGAGEMENTS.map((engagement) => (
                    <option key={engagement.value} value={engagement.value}>
                      {engagement.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('status')}>
                  Where it stands
                </label>
                <select
                  id={field('status')}
                  name="status"
                  className={styles.select}
                  defaultValue={was('status', 'lead')}
                  aria-invalid={invalid('status')}
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <p className={styles.hint}>Later stages are reached by moving the project on, so the change is recorded.</p>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('templateId')}>
                  Plan
                </label>
                <select
                  id={field('templateId')}
                  name="templateId"
                  className={styles.select}
                  key={serviceLine}
                  defaultValue={sent ? sent.templateId : (usable.find((template) => template.isDefault)?.id ?? '')}
                  aria-invalid={invalid('templateId')}
                >
                  <option value="">Start empty</option>
                  {usable.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className={styles.hint}>
                  {usable.length === 0
                    ? 'No plan written for this service line yet. The project starts empty.'
                    : 'Fills in the phases, deliverables, the things you need from them, and the fee lines to be priced. All editable afterwards.'}
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('startDate')}>
                  Start date (optional)
                </label>
                <input
                  id={field('startDate')}
                  name="startDate"
              defaultValue={was('startDate')}
                  type="date"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={field('targetDate')}>
                  Target date (optional)
                </label>
                <input
                  id={field('targetDate')}
                  name="targetDate"
              defaultValue={was('targetDate')}
                  type="date"
                  className={styles.input}
                  aria-invalid={invalid('targetDate')}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.label} htmlFor={field('summary')}>
                  What the work is (optional)
                </label>
                <textarea
                  id={field('summary')}
                  name="summary"
              defaultValue={was('summary')}
                  className={styles.textarea}
                  maxLength={2000}
                />
                <p className={styles.hint}>A sentence or two. This one the client does see.</p>
              </div>
            </>
          )}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? 'Creating…' : 'Create client'}
        </button>
        <p className={styles.payoff}>
          {startProject
            ? 'Creates the organisation, the contact and the project together — or nothing at all if any part fails.'
            : 'Creates the organisation and the contact. You can add a project whenever one is agreed.'}
        </p>
      </div>

      {state.message && (
        <p className={styles.formError} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
