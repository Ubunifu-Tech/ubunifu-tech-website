#!/usr/bin/env node
/**
 * Stops a production build that is missing the variables the console cannot
 * work without.
 *
 * Without this the build goes green and the site deploys, and the first sign of
 * trouble is a member of staff being told a sign-in link is on its way when none
 * could be made. Failing here keeps the previous deployment live instead.
 *
 * Runs first in the build, before anything touches the database, so a
 * misconfigured deploy never migrates. Only production builds are checked:
 * previews and local builds are allowed to run without these.
 */

if (process.env.VERCEL_ENV !== 'production') process.exit(0);

const REQUIRED = ['DATABASE_URL', 'CONSOLE_SESSION_SECRET', 'RESEND_API_KEY'];

// These switch their feature off gracefully when unset, so they only warn.
const OPTIONAL = {
  ANTHROPIC_API_KEY: 'the chat and the drafting assistant are switched off',
  BLOB_READ_WRITE_TOKEN: 'file uploads are switched off',
};

const isEmpty = (name) => !(process.env[name] ?? '').trim();

for (const [name, effect] of Object.entries(OPTIONAL)) {
  if (isEmpty(name)) console.warn(`[env] ${name} is not set, so ${effect}.`);
}

const missing = REQUIRED.filter(isEmpty);
if (missing.length) {
  console.error(
    `\n[env] Missing in the Production environment: ${missing.join(', ')}.` +
      '\n[env] The deployment has been stopped; the previous one stays live. Add them in Vercel under Settings, Environment Variables, then redeploy.\n',
  );
  process.exit(1);
}

console.log('[env] Production variables are set.');
