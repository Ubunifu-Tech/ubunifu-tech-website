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
import { ENGAGEMENTS, SERVICE_LINES } from '@/lib/console/project-status';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import forms from '@/styles/forms.module.css';

const INITIAL: NewProjectState = { status: 'idle' };


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
  team,
  me,
  from,
}: {
  clientId: string;
  clientName: string;
  currency: string;
  templates: TemplateOption[];
  /** Who can lead it: the people on the team who can sign in. */
  team: { id: string; name: string }[];
  /** Whoever is creating it, who leads it unless they choose someone else. */
  me: string;
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
              hint="A reference is assigned automatically."
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
              name="ownerId"
              label="Owner"
              defaultValue={me}
              invalid={invalid('ownerId')}
              disabled={pending}
            >
              <option value="">Nobody yet</option>
              {team.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="currency"
              label="Currency"
              defaultValue={currency}
              invalid={invalid('currency')}
              disabled={pending}
              hint="Fees and invoices on this project are charged in it."
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {currencyLabel(code)}
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
                  ? 'There is no ready-made plan for this kind of work. It starts empty, and you add the phases on the Plan tab.'
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
