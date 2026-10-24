'use client';

import { useActionState, useState } from 'react';
import { createClient, type NewClientState } from './actions';
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

const INITIAL: NewClientState = { status: 'idle' };

export type TemplateOption = {
  id: string;
  name: string;
  serviceLine: string;
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

/**
 * A new client on one page: the organisation, the person, and their first
 * project if there is one yet. Nothing is saved until Create.
 */
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

  // React resets the form once the action returns, so after a refusal every
  // uncontrolled field falls back to its default. Pointing the defaults at
  // what was just posted keeps the typing on screen.
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.values) {
      setStartProject(state.values.startProject);
      if (state.values.serviceLine) setServiceLine(state.values.serviceLine);
    }
  }
  const sent = state.values;
  const was = (name: keyof NonNullable<typeof sent>, fallback = '') =>
    sent ? String(sent[name] ?? '') : fallback;
  const invalid = (name: string) => (state.field === name ? true : undefined);

  // Only the plans written for the chosen service line.
  const usable = templates.filter((template) => template.serviceLine === serviceLine);

  return (
    <form action={action} className={forms.form}>
      {/* Carried through the post so the enquiry is marked converted and
          linked to the client in the same transaction that creates it. */}
      {prefill && <input type="hidden" name="enquiryId" value={prefill.enquiryId} />}

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={forms.sectionTitle}>Organisation</legend>
          <div className={forms.grid}>
            <TextField
              name="name"
              label="Name"
              optional
              wide
              defaultValue={was('name')}
              maxLength={160}
              autoComplete="organization"
              invalid={invalid('name')}
              disabled={pending}
              hint="Leave it blank for someone working on their own."
            />
            <TextField
              name="legalName"
              label="Registered name"
              optional
              defaultValue={was('legalName')}
              maxLength={200}
              disabled={pending}
              hint="If it differs. Agreements and invoices use it."
            />
            <TextField
              name="website"
              label="Website"
              type="url"
              optional
              defaultValue={was('website')}
              placeholder="https://"
              invalid={invalid('website')}
              disabled={pending}
            />
            <TextField
              name="country"
              label="Country"
              defaultValue={was('country', 'TZ')}
              maxLength={2}
              required
              invalid={invalid('country')}
              disabled={pending}
              hint="Two letters, such as TZ."
            />
            <SelectField
              name="currency"
              label="Billing currency"
              defaultValue={was('currency', 'USD')}
              invalid={invalid('currency')}
              disabled={pending}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {currencyLabel(code)}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              name="notes"
              label="Notes"
              optional
              wide
              defaultValue={was('notes', prefill?.notes)}
              maxLength={6000}
              disabled={pending}
              hint="Only the team sees these."
            />
          </div>
        </fieldset>
      </div>

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={forms.sectionTitle}>Contact</legend>
          <div className={forms.grid}>
            <TextField
              name="contactName"
              label="Full name"
              defaultValue={was('contactName', prefill?.contactName)}
              required
              maxLength={120}
              invalid={invalid('contactName')}
              disabled={pending}
            />
            <TextField
              name="contactEmail"
              label="Email"
              type="email"
              optional
              defaultValue={was('contactEmail', prefill?.contactEmail)}
              invalid={invalid('contactEmail')}
              disabled={pending}
              hint="They sign in to the portal with it. Without one, share a setup link from their client page."
            />
            <TextField
              name="contactRole"
              label="Role"
              optional
              defaultValue={was('contactRole')}
              maxLength={120}
              disabled={pending}
            />
            <TextField
              name="contactPhone"
              label="Phone"
              type="tel"
              optional
              defaultValue={was('contactPhone')}
              maxLength={40}
              disabled={pending}
            />
            <CheckField
              // Drawn afresh for what was posted, so the form's reset after a
              // refusal puts the tick back as it was sent.
              key={sent ? `invite-${sent.sendInvite}` : 'invite'}
              name="sendInvite"
              label="Email them a portal invitation now"
              hint="You can send it later from their client page."
              defaultChecked={sent ? sent.sendInvite : true}
              wide
              disabled={pending}
            />
          </div>
        </fieldset>
      </div>

      {canStartProject && (
        <div className={forms.card}>
          <fieldset className={forms.section}>
            <legend className={forms.sectionTitle}>Project</legend>
            <div className={forms.grid}>
              <CheckField
                name="startProject"
                label="Start a project for them now"
                checked={startProject}
                onChange={(event) => setStartProject(event.target.checked)}
                wide
                disabled={pending}
              />

              {startProject && (
                <>
                  <TextField
                    name="projectName"
                    label="Project name"
                    wide
                    defaultValue={was('projectName', prefill?.projectName)}
                    maxLength={160}
                    invalid={invalid('projectName')}
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
                    defaultValue={was('ownerId', me)}
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
                    name="templateId"
                    label="Plan"
                    key={serviceLine}
                    defaultValue={sent ? sent.templateId : (usable.find((t) => t.isDefault)?.id ?? '')}
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
                  <DateField
                    name="startDate"
                    label="Start date"
                    optional
                    defaultValue={was('startDate')}
                    disabled={pending}
                  />
                  <DateField
                    name="targetDate"
                    label="Target date"
                    optional
                    defaultValue={was('targetDate')}
                    invalid={invalid('targetDate')}
                    disabled={pending}
                  />
                  <TextAreaField
                    name="summary"
                    label="What the work is"
                    optional
                    wide
                    defaultValue={was('summary')}
                    maxLength={2000}
                    disabled={pending}
                    hint="The client sees this."
                  />
                  <CheckField
                    key={sent ? `started-${sent.status === 'in_progress'}` : 'started'}
                    name="started"
                    label="Work has already started"
                    hint="It opens In progress instead of as a deal."
                    defaultChecked={sent ? sent.status === 'in_progress' : false}
                    wide
                    disabled={pending}
                  />
                </>
              )}
            </div>
          </fieldset>
        </div>
      )}

      {state.message && (
        <p className={forms.error} role="alert">
          {state.message}
          {state.signedOut && (
            <>
              {' '}
              <a href="/sign-in" target="_blank" rel="noopener" className={forms.link}>
                Sign in
              </a>
            </>
          )}
        </p>
      )}
      <div className={`${forms.actions} ${forms.actionsBare}`}>
        <button type="submit" className={forms.button} disabled={pending}>
          {pending ? 'Creating…' : startProject ? 'Create client and project' : 'Create client'}
        </button>
      </div>
    </form>
  );
}
