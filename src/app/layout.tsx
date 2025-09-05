import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import CrispChat from '@/components/CrispChat'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MedQ - Medical Questions Platform',
  description: 'A platform for medical education and question management',
}

// Ensure proper mobile responsiveness
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
  <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
    {/* Preload PDF worker to avoid race conditions in production */}
    <link rel="preload" as="script" href="/pdf.worker.min.mjs" />
    <link rel="prefetch" href="/pdf.worker.min.mjs" />
        <Providers>
          {/* Crisp live chat widget (needs AuthProvider) */}
          <CrispChat />
          {children}
        </Providers>
      </body>
    </html>
  )
}