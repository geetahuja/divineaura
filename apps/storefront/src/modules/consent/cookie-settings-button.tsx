"use client"

import { openConsentSettings } from "@lib/consent"

// Footer link to change cookie choices at any time.
export default function CookieSettingsButton() {
  return (
    <button type="button" onClick={openConsentSettings} className="underline hover:text-white">
      Cookie settings
    </button>
  )
}
