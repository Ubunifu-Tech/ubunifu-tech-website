'use client';

import React, { useActionState, useState } from 'react';
import { createProject, type NewProjectState } from './actions';
import type { TemplateOption } from '../../clients/new/NewClientForm';
import {
  DateField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/console/Fields';
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
  { value: 'lead', label: 'Lead' },
  { value: 'proposal_draft', label: 'Writing the proposal' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'proposal_accepted', label: 'Proposal accepted' },
];

export function NewProjectForm({
  clientId,
  clientName,
  currency,
  templates,
  from,
}: {
  clientId: string;
  clientName: string;
  currency: string;
  templates: TemplateOption[];
  /** The enquiry this project answers, when it started as one. */
  from?: { enquiryId: string; name: string; summary: string; serviceLine: string | null };
}) {
  const [state, action, pending] = useActionState(createProject, INITIAL);
  const [serviceLine, setServiceLine] = useState(from?.serviceLine ?? 'web');
  const invalid = (name: string) => (state.field === name ? true : undefined);
  const usable = templates.filter((template) => template.serviceLine === serviceLine);

  return (
    <form action={action} className={forms.form}>
      <input type="hidden" name="clientId" value={clientId} />
      {from && <input type="hidden" name="enquiryId" value={from.enquiryId} />}

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueAccent}`}>
            New work for {clientName}
          </legend>
          <div className={forms.grid}>
            <TextField
              name="name"
              label="Project name"
              defaultValue={from?.name}
              wide
              required
              maxLength={160}
              invalid={invalid('name')}
              disabled={pending}
              hint={`A reference is assigned automatically. Billed in ${currency}, like the rest of this client's work.`}
            />

            <SelectField
              name="serviceLine"
              label="Service line"
              value={serviceLine}
              onChange={setServiceLine}
              invalid={invalid('serviceLine')}
              disabled={pending}
            >
              {SERVICE_LINES.map((line) => (
                <option key={line.value} value={line.value}>
                  {line.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="engagementType"
              label="How it is billed"
              defaultValue="fixed_price_project"
              invalid={invalid('engagementType')}
              disabled={pending}
            >
              {ENGAGEMENTS.map((engagement) => (
                <option key={engagement.value} value={engagement.value}>
                  {engagement.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="status"
              label="Where it stands"
              defaultValue="lead"
              invalid={invalid('status')}
              disabled={pending}
              hint="A lead is somebody you have spoken to with nothing sent yet. Later stages are reached by moving the project on, so the change is recorded."
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="templateId"
              label="Plan"
              key={serviceLine}
              defaultValue={usable.find((template) => template.isDefault)?.id ?? ''}
              invalid={invalid('templateId')}
              disabled={pending}
              hint={
                usable.length === 0
                  ? 'No plan written for this service line yet.'
                  : 'Phases, deliverables, what you need from them, and the fee lines to be priced.'
              }
            >
              <option value="">Start empty</option>
              {usable.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </SelectField>

            <DateField name="startDate" label="Start date" optional disabled={pending} />

            <DateField
              name="targetDate"
              label="Target date"
              optional
              invalid={invalid('targetDate')}
              disabled={pending}
            />

            <TextAreaField
              name="summary"
              label="What the work is"
              defaultValue={from?.summary}
              optional
              wide
              maxLength={2000}
              disabled={pending}
              hint="A sentence or two. This one the client does see."
            />
          </div>
        </fieldset>

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Creating…' : 'Start the project'}
          </button>
          <p className={forms.payoff}>
            Opens the new project, ready to plan and price.
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
