import 'server-only';

/**
 * Why nobody at a client can be emailed, or null when someone can.
 *
 * An email goes to a person with portal access and an address. The three
 * reasons nobody qualifies are fixed in different places, so each gets its
 * own sentence: saying "has no email" to someone whose people all have an
 * address but their access turned off sends them looking for the wrong fix.
 * The way forward is a hand-off for a role that does not handle clients.
 */
export function nobodyToEmail(
  clientName: string,
  people: { email: string | null; canSignIn: boolean }[],
  handlesClients: boolean,
): string | null {
  if (people.some((person) => person.canSignIn && person.email)) return null;
  if (people.length === 0) {
    return `Nobody at ${clientName} is on file yet.${
      handlesClients
        ? ' Add their people on the client page.'
        : ' Someone who handles clients needs to add them.'
    }`;
  }
  if (people.some((person) => person.email)) {
    return `Portal access is off for everyone at ${clientName} with an email.${
      handlesClients
        ? ' Turn it on from the client page.'
        : ' Someone who handles clients needs to turn it on.'
    }`;
  }
  return `Nobody at ${clientName} has an email yet.${
    handlesClients ? ' Add one on the client page.' : ' Someone who handles clients needs to add one.'
  }`;
}
