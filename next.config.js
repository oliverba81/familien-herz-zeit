/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build-Zielordner konfigurierbar machen: Das Self-Update baut nach `.next.new`
  // (NEXT_DIST_DIR=.next.new), während die laufende App weiter aus `.next` bedient.
  // Nach erfolgreichem Build wird atomar getauscht. Ohne gesetzte Variable: Standard `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Stelle sicher, dass PDFKit als externes Paket behandelt wird
  // Dies verhindert, dass Next.js PDFKit bundelt und die Font-Dateien verloren gehen
  // Funktioniert sowohl mit Webpack als auch mit Turbopack
  serverExternalPackages: ['pdfkit'],
  // Turbopack-Konfiguration (leer, da serverExternalPackages ausreicht)
  turbopack: {},
  // Größere Uploads (z. B. /api/media): Body-Limit erhöhen (413 Request Entity Too Large)
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
    proxyClientMaxBodySize: '50mb',
  },
  // Upload-Bilder über API ausliefern, damit /uploads/images/* auch hinter Nginx/Proxy funktioniert
  async rewrites() {
    return [
      {
        source: '/uploads/images/:path*',
        destination: '/api/media/serve/:path*',
      },
    ]
  },
  // Nach Deploy: Startseite nicht lange cachen, damit Besucher neues HTML (mit gültigen Chunk-URLs) bekommen.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ]
  },
}

module.exports = nextConfig

