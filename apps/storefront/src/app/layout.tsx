import { getBrand } from "@lib/data/content"
import { getBaseURL } from "@lib/util/env"
import Analytics from "@modules/consent/analytics"
import ConsentBanner from "@modules/consent/consent-banner"
import { Metadata } from "next"
import { Cormorant_Garamond, Mulish, Noto_Serif_Devanagari } from "next/font/google"
import "styles/globals.css"

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
})
const sans = Mulish({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
// Hindi taglines only; not preloaded so it never competes with the LCP text.
const deva = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: ["500", "600"], variable: "--font-deva", display: "swap", preload: false })

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand()
  return {
    metadataBase: new URL(getBaseURL()),
    title: { default: `${brand.name} – ${brand.tagline_en}`, template: `%s | ${brand.name}` },
    applicationName: brand.name,
    // Google Search Console: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the meta-tag code.
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
  }
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-mode="light" className={`${serif.variable} ${sans.variable} ${deva.variable}`} suppressHydrationWarning>
      <head>
        <link rel="ucp" href="/.well-known/ucp" />
        {/* Hide the consent banner before first paint when a choice is already saved. */}
        <script dangerouslySetInnerHTML={{ __html: "if(document.cookie.indexOf('da_consent=')>-1)document.documentElement.classList.add('consent-set')" }} />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary">
          Skip to content
        </a>
        <main className="relative" id="main-content">{props.children}</main>
        <ConsentBanner />
        <Analytics />
      </body>
    </html>
  )
}
