/** In-page replacements for retained editorial assets. Social images stay unchanged. */
export const projectDiagrams = {
  '/editorial/safari-field-v3.webp': {
    kind: 'operations',
    description: 'Safari King’s operations platform connects trip enquiries, customer records, and drafting with human review.',
  },
  '/editorial/usambara-landscape-v3.webp': {
    kind: 'enquiry',
    description: 'Usambara’s trip enquiry form sends an operator notification and a visitor confirmation.',
  },
} as const;

export type ProjectDiagramKind = (typeof projectDiagrams)[keyof typeof projectDiagrams]['kind'];

export function getProjectDiagram(src: unknown) {
  if (typeof src !== 'string' || !Object.hasOwn(projectDiagrams, src)) return undefined;
  return projectDiagrams[src as keyof typeof projectDiagrams];
}
