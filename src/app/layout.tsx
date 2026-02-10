import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import { LanguageProvider, LanguageToggle } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'FAFA Shopify',
  description: 'Quick product creation for Shopify',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <main className="max-w-lg mx-auto px-4 pt-4 pb-20 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10" />
              <img
                src="https://sttmall.hk/cdn/shop/files/STTMall_Logo_horizontal_ea1429f1-378e-4b3e-993f-c6397e5e7091.png?height=100&v=1749203186"
                alt="STT Mall"
                className="h-10"
              />
              <LanguageToggle />
            </div>
            {children}
          </main>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  )
}
