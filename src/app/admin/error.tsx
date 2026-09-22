'use client';

import { AppError } from '@/components/console/AppError';

export default function ConsoleError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppError {...props} home="/" label="Back to the overview" />;
}
