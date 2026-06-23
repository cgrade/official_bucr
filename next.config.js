/** @type {import('next').NextConfig} */

// Static security headers applied to every response by the framework.
// These live here (not in middleware) because middleware's NextResponse.next()
// header mutations do NOT reliably propagate onto App Router Route Handler
// responses — next.config headers() is the dependable mechanism.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // Force HTTPS for 2 years (incl. subdomains). Safe: the API is HTTPS-only in prod.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

// CORS for the API. Auth is Bearer-token only (no cookies / withCredentials),
// so credentials mode is unnecessary — and "Allow-Origin: *" with
// "Allow-Credentials: true" is an invalid combination browsers reject. We use a
// wildcard origin WITHOUT credentials, which is valid and leaks nothing a
// Bearer token doesn't already gate.
const corsHeaders = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
  {
    key: 'Access-Control-Allow-Headers',
    value:
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  },
  { key: 'Access-Control-Max-Age', value: '86400' },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      // Security headers on everything this app serves.
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // CORS (+ security headers again so a narrower match still carries them) on the API.
      {
        source: '/api/:path*',
        headers: [...securityHeaders, ...corsHeaders],
      },
    ];
  },
};

module.exports = nextConfig;
