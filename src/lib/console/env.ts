import 'server-only';

/**
 * Console environment, read once and validated loudly.
 *
 * Anything security-relevant fails fast rather than falling back to a default.
 * A missing session secret must stop the process, not silently sign tokens with
 * an empty string.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/**
 * Only used where a weak value is safe. The session secret deliberately has no
 * fallback.
 */
export const consoleEnv = {
  /** Host that serves the staff console. Admin routes 404 on any other host. */
  get adminHost(): string {
    return optional('CONSOLE_ADMIN_HOST', 'admin.ubunifutech.com');
  },

  /** Public origin used to build links in outgoing email. */
  get publicOrigin(): string {
    return optional('CONSOLE_PUBLIC_ORIGIN', 'https://ubunifutech.com');
  },

  /** Origin of the admin console, used for staff sign-in links. */
  get adminOrigin(): string {
    const explicit = process.env.CONSOLE_ADMIN_ORIGIN;
    if (explicit) return explicit;
    const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${scheme}://${consoleEnv.adminHost}`;
  },

  /** HMAC key for session and magic-link tokens. No fallback on purpose. */
  get sessionSecret(): string {
    return required('CONSOLE_SESSION_SECRET');
  },

  /**
   * The company account. Its first sign-in sets the console up and makes it
   * the owner; it is always allowed in, whatever the list below says.
   */
  get ownerEmail(): string {
    return optional('CONSOLE_OWNER_EMAIL', 'info@ubunifutech.com').trim().toLowerCase();
  },

  /**
   * Addresses allowed to sign in, as an extra fence around the team. Being
   * on it is not enough on its own: a person must also have been added on
   * the Team page, so a stray row in StaffUser cannot become access. An entry
   * starting with @ allows a whole domain. Unset, it allows the company
   * account's domain, so anyone an owner adds with an @ubunifutech.com
   * address can sign in without a redeploy.
   */
  get staffAllowlist(): string[] {
    const owner = consoleEnv.ownerEmail;
    return optional('CONSOLE_STAFF_EMAILS', owner.slice(owner.lastIndexOf('@')))
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};

/**
 * Hosts that may serve the admin console. In development the console runs on
 * admin.localhost, which resolves to 127.0.0.1 without touching /etc/hosts.
 */
export function adminHosts(): string[] {
  const hosts = [consoleEnv.adminHost.toLowerCase()];
  if (!consoleEnv.isProduction) {
    hosts.push('admin.localhost');
  }
  return hosts;
}

/** Strips the port so host checks work on localhost:3001 too. */
export function hostnameOf(host: string | null): string {
  if (!host) return '';
  return host.split(':')[0]!.toLowerCase();
}

export function isAdminHost(host: string | null): boolean {
  const hostname = hostnameOf(host);
  return hostname !== '' && adminHosts().includes(hostname);
}

/** Whether an address is on the staff allowlist, by address or by domain. */
export function isStaffEmailAllowed(email: string): boolean {
  const address = email.trim().toLowerCase();
  if (address === consoleEnv.ownerEmail) return true;
  const domain = address.slice(address.lastIndexOf('@'));
  return consoleEnv.staffAllowlist.some((entry) =>
    entry.startsWith('@') ? entry === domain : entry === address,
  );
}

/** The allowlisted domains, for telling an owner who they can invite. */
export function staffDomains(): string[] {
  return consoleEnv.staffAllowlist.filter((entry) => entry.startsWith('@'));
}
