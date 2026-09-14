/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig = {
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/klant/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },
  serverExternalPackages: ['@neondatabase/serverless'],
  experimental: {
    // Het logo in de PDF's wordt op de server van schijf gelezen. Zonder dit
    // zit public/ niet in de bundel van de serverfunctie en valt de kop terug
    // op de bedrijfsnaam in tekst.
    outputFileTracingIncludes: {
      '/api/offertes/[id]/pdf': ['./public/logo-wit-site.png'],
      '/api/offertes/[id]/versturen': ['./public/logo-wit-site.png'],
      '/api/facturen/[id]/pdf': ['./public/logo-wit-site.png'],
      '/api/facturen/[id]/versturen': ['./public/logo-wit-site.png'],
    },
  },
}

export default nextConfig
