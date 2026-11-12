"use client"

import { Consent, readConsentCookie } from "@lib/consent"
import Script from "next/script"
import { useEffect, useState } from "react"

const safeId = (id?: string | null) => (id && /^[A-Za-z0-9-]+$/.test(id) ? id : null)

// Loads GA4 / Meta Pixel ONLY when the server reports their IDs (set in .env,
// SITE_MODE=live — /api/site-config, read at runtime) AND the visitor accepted
// that category. Page views are tracked; e-commerce events come from lib/analytics.
export default function Analytics() {
  const [c, setC] = useState<Consent | null>(null)
  const [ids, setIds] = useState<{ ga4: string | null; pixel: string | null }>({ ga4: null, pixel: null })
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((j) => setIds({ ga4: j.ga4 ?? null, pixel: j.pixel ?? null }))
      .catch(() => undefined)
  }, [])
  useEffect(() => {
    setC(readConsentCookie())
    const on = (e: Event) => setC((e as CustomEvent<Consent>).detail)
    window.addEventListener("da:consent", on)
    return () => window.removeEventListener("da:consent", on)
  }, [])
  const ga = safeId(ids.ga4)
  const px = safeId(ids.pixel)

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
