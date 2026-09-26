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

/** What a bill can be: a PDF, or a photo of the paper one. */
export const BILL_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** 10 MB, far more than a bill needs. */
export const MAX_BILL_BYTES = 10 * 1024 * 1024;

/** The folder a cost's bill is stored under, which binds the file to the cost. */
export const billFolder = (costId: string) => `costs/${costId}`;
