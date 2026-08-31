import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KuroBooth — Cetak Kenangan Indah',
  description: 'Web photobooth profesional. Pilih template, ambil foto, dan cetak atau bagikan strip foto kamu!',
  keywords: 'photobooth, foto, cetak, strip foto, kurobooth, korea photobooth',
  authors: [{ name: 'KuroBooth App' }],
  openGraph: {
    title: 'KuroBooth — Cetak Kenangan Indah',
    description: 'Buat strip foto cantik dengan berbagai template premium. Bisa dicetak dan dibagikan!',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
