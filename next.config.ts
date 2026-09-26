import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-XSS-Protection', value: '0' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
    : []),
];

/**
 * The parts of a content policy that cannot break a page: no plugins, no
 * rewriting where relative links point, and no framing by other sites. Not on
 * stored files, which carry a stricter policy of their own that this would
 * replace.
 */
const pagePolicy = {
  key: 'Content-Security-Policy',
  value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
};

const nextConfig: NextConfig = {
  // Keep framework-generated AI instruction files out of the project root.
  agentRules: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:path((?!files/|media/|portal/files/|admin/files/|admin/media/).*)',
        headers: [pagePolicy],
      },
    ];
  },
};

export default nextConfig;
