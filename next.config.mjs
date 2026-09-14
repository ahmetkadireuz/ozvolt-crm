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
  // Let op: `serverExternalPackages` zonder `experimental` is de naam uit
  // Next 15. Dit project draait 14.2, daar heet hij anders en werd de regel
  // dus genegeerd. Beide staan er nu, zodat een upgrade later niets breekt.
  serverExternalPackages: ['pdfkit', '@neondatabase/serverless'],
  experimental: {
    // pdfkit leest zijn lettertypebestanden tijdens het draaien van schijf,
    // met fs.readFileSync(__dirname + '/data/Helvetica.afm'). Bundelt Next
    // het pakket mee, dan klopt __dirname niet meer en bestaan die bestanden
    // niet in de serverfunctie. Buiten de bundel houden lost dat op.
    serverComponentsExternalPackages: ['pdfkit', '@neondatabase/serverless'],

    // Extra zekerheid: het logo en de lettertypedata expliciet meenemen in de
    // bundel van de routes die een PDF maken.
    outputFileTracingIncludes: {
      '/api/offertes/[id]/pdf': ['./public/logo-wit-site.png', './node_modules/pdfkit/js/data/*.afm'],
      '/api/offertes/[id]/versturen': ['./public/logo-wit-site.png', './node_modules/pdfkit/js/data/*.afm'],
      '/api/facturen/[id]/pdf': ['./public/logo-wit-site.png', './node_modules/pdfkit/js/data/*.afm'],
      '/api/facturen/[id]/versturen': ['./public/logo-wit-site.png', './node_modules/pdfkit/js/data/*.afm'],
    },
  },
}

export default nextConfig
