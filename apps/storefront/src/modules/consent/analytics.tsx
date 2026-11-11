"use client"

import { Consent, readConsentCookie } from "@lib/consent"
import Script from "next/script"
import { useEffect, useState } from "react"

const GA4 = process.env.NEXT_PUBLIC_GA4_ID
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID
const safeId = (id?: string) => (id && /^[A-Za-z0-9-]+$/.test(id) ? id : null)

// Loads GA4 / Meta Pixel ONLY when their IDs are set in .env AND the visitor
// accepted that category. Page views are tracked; e-commerce events come from lib/analytics.
export default function Analytics() {
  const [c, setC] = useState<Consent | null>(null)
  useEffect(() => {
    setC(readConsentCookie())
    const on = (e: Event) => setC((e as CustomEvent<Consent>).detail)
    window.addEventListener("da:consent", on)
    return () => window.removeEventListener("da:consent", on)
  }, [])
  const ga = safeId(GA4)
  const px = safeId(PIXEL)

  return (
    <>
      {ga && c?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      )}
      {px && c?.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  )
}
