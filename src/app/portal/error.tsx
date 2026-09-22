'use client';

import { AppError } from '@/components/console/AppError';

export default function PortalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppError {...props} home="/portal" label="Back to your projects" />;
}
