import type { Metadata, Viewport } from 'next'
import { Newsreader, Inter, JetBrains_Mono } from 'next/font/google'
import SwRegister from '@/components/SwRegister'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Idea Garden',
  description: 'Where raw thoughts grow into something usable.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Idea Garden',
  },
  icons: {
    icon: [
      { url: '/logo-assets/mark.svg', type: 'image/svg+xml' },
      { url: '/logo-assets/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo-assets/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-assets/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo-assets/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/logo-assets/apple-touch-icon.png',
  },
  openGraph: {
    images: '/logo-assets/og-image.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#E6734E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
