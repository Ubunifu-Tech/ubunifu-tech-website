/**
 * What a cost was for, in words. Client-safe, for the forms and the reports.
 */
export const COST_CATEGORIES = [
  { value: 'hosting', label: 'Hosting and deploys' },
  { value: 'email', label: 'Email' },
  { value: 'domains', label: 'Domains' },
  { value: 'ai', label: 'AI usage' },
  { value: 'software', label: 'Software and tools' },
  { value: 'services', label: 'Freelancers and services' },
  { value: 'other', label: 'Something else' },
] as const;

export const COST_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  COST_CATEGORIES.map((category) => [category.value, category.label]),
);
