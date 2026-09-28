// What the careers page says, and what the website assistant says when someone
// asks about jobs. Both read this file, so they cannot disagree.
//
// `openRoles` stays empty until a vacancy is confirmed. Publishing one is a page
// change as well: /careers and its description say there are none, so give the
// role its section there in the same commit.

import { site } from './site';

export const careers = {
  /** Titles of advertised roles. */
  openRoles: [] as string[],
  /** The heading the page shows while there are none. */
  noRoles: 'No open roles right now',
  note: 'We are not currently advertising jobs, internships, or contract roles.',
  /** Where a general introduction goes. */
  introEmail: site.contact.email,
  /** How to send one. `{email}` is where the page puts the address as a link. */
  intro:
    'If you would still like to make a general introduction, send a short note to {email} with the kind of work you do or a link to your portfolio. We can’t guarantee a reply.',
};

/** The introduction sentence with the address written in, for plain text. */
export function careersIntro(): string {
  return careers.intro.replace('{email}', careers.introEmail);
}
