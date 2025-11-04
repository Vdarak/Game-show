import type React from "react"
import type { Metadata } from "next"
import { Inter, Rubik, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { PWARegister } from "@/components/pwa/pwa-register"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const rubik = Rubik({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
})
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Family Feud Game Show",
  description: "Interactive Family Feud-style game show application with offline support",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Family Feud",
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export function generateViewport() {
  return {
    themeColor: "#1F2937",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Creepster&family=Mountains+of+Christmas:wght@400;700&family=Lobster&family=Nosifer&family=Satisfy&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${rubik.variable} ${geistMono.variable} font-sans antialiased`}>
        <PWARegister />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
