'use client';

import { useState } from 'react';
import { Select } from '@/components/console/Select';
import { NewDocument } from '../../projects/[slug]/NewDocument';
import forms from '@/styles/forms.module.css';

export type ProjectChoice = { id: string; label: string; name: string };

/**
 * A proposal or an agreement, started from anywhere: say which project it is
 * for, then what it is. The same two fields as on a project's Documents tab,
 * with the project chosen first.
 */
export function StartDocument({ projects, chosen }: { projects: ProjectChoice[]; chosen: string }) {
  const [projectId, setProjectId] = useState(chosen);
  const project = projects.find((option) => option.id === projectId);
  return (
    <div className={forms.form}>
      <div className={forms.field}>
        <span className={forms.label} id="document-project-label">
          Project
        </span>
        <Select
          aria-labelledby="document-project-label"
          value={projectId}
          onValueChange={setProjectId}
          placeholder="Choose the project it is for"
          options={projects.map((option) => ({ value: option.id, label: option.label }))}
        />
      </div>
      {project && <NewDocument key={project.id} projectId={project.id} projectName={project.name} />}
    </div>
  );
}
