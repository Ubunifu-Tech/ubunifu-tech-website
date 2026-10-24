'use client';

import { useActionState, useState } from 'react';
import { createProject, type NewProjectState } from './actions';
import type { TemplateOption } from '../../clients/new/NewClientForm';
import {
  CheckField,
  DateField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/console/Fields';
import { SERVICE_LINES } from '@/lib/console/project-status';
import { CURRENCIES, currencyLabel } from '@/lib/console/currencies';
import forms from '@/styles/forms.module.css';

const INITIAL: NewProjectState = { status: 'idle' };

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
          <legend className={forms.sectionTitle}>For {clientName}</legend>
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
              name="ownerId"
              label="Lead"
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
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {currencyLabel(code)}
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
              hint={usable.length === 0 ? 'No ready-made plan for this kind of work yet.' : undefined}
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
              hint="The client sees this."
            />

            <CheckField
              name="started"
              label="Work has already started"
              hint="It opens In progress instead of as a deal."
              wide
              disabled={pending}
            />
          </div>
        </fieldset>

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Creating…' : 'Create project'}
          </button>
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
