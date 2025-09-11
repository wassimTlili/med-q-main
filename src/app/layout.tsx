import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import CrispChat from '@/components/CrispChat'
import { PDFProvider } from '@/components/pdf/PDFProvider'

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
        <Providers>
          <PDFProvider>
          {/* Crisp live chat widget (needs AuthProvider) */}
          <CrispChat />
          {children}
          </PDFProvider>
        </Providers>
      </body>
    </html>
  )
}