'use client';

import React, { useActionState, useId, useState } from 'react';
import { createProject, type NewProjectState } from './actions';
import type { TemplateOption } from '../../clients/new/NewClientForm';
import forms from '@/styles/forms.module.css';

const INITIAL: NewProjectState = { status: 'idle' };

const SERVICE_LINES = [
  { value: 'web', label: 'Websites & custom platforms' },
  { value: 'hosting', label: 'Hosting, domains & email' },
  { value: 'branding', label: 'Brand identity & design' },
  { value: 'data', label: 'Data & business intelligence' },
  { value: 'ai', label: 'AI & automation' },
  { value: 'strategy', label: 'Technology strategy & advisory' },
  { value: 'product', label: 'Product subscription' },
  { value: 'other', label: 'Something else' },
];

const ENGAGEMENTS = [
  { value: 'fixed_price_project', label: 'Fixed price project' },
  { value: 'retainer', label: 'Monthly retainer' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'support_only', label: 'Support only' },
];

const STATUSES = [
  { value: 'lead', label: 'Lead — we have spoken, nothing sent' },
  { value: 'proposal_draft', label: 'Writing the proposal' },
  { value: 'proposal_sent', label: 'Proposal sent, waiting' },
  { value: 'proposal_accepted', label: 'Proposal accepted' },
];

function Select({
  id,
  name,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; name: string }) {
  return (
    <span className={forms.selectWrap}>
      <select id={id} name={name} className={`${forms.control} ${forms.select}`} {...rest}>
        {children}
      </select>
    </span>
  );
}

export function NewProjectForm({
  clientId,
  clientName,
  currency,
  templates,
}: {
  clientId: string;
  clientName: string;
  currency: string;
  templates: TemplateOption[];
}) {
  const [state, action, pending] = useActionState(createProject, INITIAL);
  const [serviceLine, setServiceLine] = useState('web');
  const ids = useId();

  const field = (name: string) => `${ids}-${name}`;
  const invalid = (name: string) => (state.field === name ? true : undefined);
  const usable = templates.filter((template) => template.serviceLine === serviceLine);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="clientId" value={clientId} />

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueAccent}`}>
            New work for {clientName}
          </legend>
          <div className={forms.grid}>
            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor={field('name')}>
                Project name
              </label>
              <input
                id={field('name')}
                name="name"
                className={forms.control}
                required
                maxLength={160}
                aria-invalid={invalid('name')}
              />
              <p className={forms.hint}>
                A reference is assigned automatically. Billed in {currency}, like the rest of this
                client&rsquo;s work.
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
                onChange={(event) => setServiceLine(event.target.value)}
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
                defaultValue="fixed_price_project"
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
                defaultValue="lead"
                aria-invalid={invalid('status')}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('templateId')}>
                Plan
              </label>
              <Select
                id={field('templateId')}
                name="templateId"
                key={serviceLine}
                defaultValue={usable.find((template) => template.isDefault)?.id ?? ''}
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
                  ? 'No plan written for this service line yet.'
                  : 'Phases, deliverables, what you need from them, and the fee lines to be priced.'}
              </p>
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('startDate')}>
                Start date <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('startDate')}
                name="startDate"
                type="date"
                className={`${forms.control} ${forms.date}`}
              />
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor={field('targetDate')}>
                Target date <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={field('targetDate')}
                name="targetDate"
                type="date"
                className={`${forms.control} ${forms.date}`}
                aria-invalid={invalid('targetDate')}
              />
            </div>

            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor={field('summary')}>
                What the work is <span className={forms.optional}>(optional)</span>
              </label>
              <textarea
                id={field('summary')}
                name="summary"
                className={`${forms.control} ${forms.textarea}`}
                maxLength={2000}
              />
              <p className={forms.hint}>A sentence or two. This one the client does see.</p>
            </div>
          </div>
        </fieldset>

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Creating…' : 'Start the project'}
          </button>
          <p className={forms.payoff}>
            Opens on the project screen, with the plan laid out and the fee lines waiting to be
            priced.
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
