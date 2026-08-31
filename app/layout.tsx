import type { Metadata, Viewport } from 'next'
import './globals.css'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kurobooth.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'KuroBooth — Web Photobooth Online Gratis & Aesthetic 300 DPI',
    template: '%s | KuroBooth',
  },
  description:
    'Aplikasi web photobooth online gratis dengan ratusan template Canva aesthetic, bunga, retro, superhero, dan Korean style. Cetak strip foto kualitas studio 300 DPI, simpan foto, dan scan QR instan di HP.',
  keywords: [
    'photobooth online',
    'web photobooth',
    'kurobooth',
    'photostrip online gratis',
    'template photobooth canva',
    'cetak strip foto 300 dpi',
    'photo booth online indonesia',
    'photobooth aesthetic korea',
    'bikin strip foto sendiri',
    'kurokii vibe coding',
  ],
  authors: [{ name: 'Kurokii', url: `${baseUrl}/developer` }],
  creator: 'Kurokii',
  publisher: 'KuroBooth',
  applicationName: 'KuroBooth',
  category: 'Photography & Entertainment',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/icon.svg',
    shortcut: '/icon.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'KuroBooth — Web Photobooth Online Gratis & Aesthetic',
    description:
      'Foto seru bareng teman dengan berbagai template photobooth Canva aesthetic, cetak resolusi tinggi 300 DPI, dan simpan langsung ke HP lewat scan QR!',
    url: baseUrl,
    siteName: 'KuroBooth',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'KuroBooth Camera Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KuroBooth — Web Photobooth Online Gratis & Aesthetic',
    description:
      'Web photobooth online gratis dengan template aesthetic Canva & Korean style. Cetak strip foto 300 DPI!',
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0D3B24',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'KuroBooth',
  url: baseUrl,
  description:
    'Aplikasi web photobooth online gratis dengan berbagai template Canva aesthetic, bunga, retro, dan korean style. Cetak strip foto kualitas studio 300 DPI.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
  author: {
    '@type': 'Person',
    name: 'Kurokii',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
