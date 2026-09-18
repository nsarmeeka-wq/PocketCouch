import type { Metadata, Viewport } from 'next'
import { Noto_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const inter = Noto_Sans({ subsets: ['latin'], variable: '--font-body' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-cormorant' })

export const metadata: Metadata = {
  title: 'Script Decipher — Ancient wisdom, rediscovered',
  description: 'Explore Script Decipher, an interactive manuscript decoding demo with editable transcriptions and fixed sample translations in international languages.',
}
export const viewport: Viewport = { themeColor: '#0c101b', colorScheme: 'dark light' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`bg-background ${inter.variable} ${cormorant.variable}`}><body className="font-sans">{children}</body></html>
}
