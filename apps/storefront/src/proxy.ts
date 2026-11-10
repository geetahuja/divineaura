import { NextRequest, NextResponse } from "next/server"

// Single-country store: public URLs have no country prefix (/products/x), and
// are rewritten internally to the starter's /[countryCode]/... routes.
const COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "in").toLowerCase()
const PREFIX = `/${COUNTRY}`

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.includes(".")) {
    return NextResponse.next()
  }

  // Old/internal prefixed URLs → canonical unprefixed URL.
  if (pathname === PREFIX || pathname.startsWith(`${PREFIX}/`)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(PREFIX.length) || "/"
    url.search = search
    return NextResponse.redirect(url, 308)
  }

  const url = request.nextUrl.clone()
  url.pathname = pathname === "/" ? PREFIX : `${PREFIX}${pathname}`
  const response = NextResponse.rewrite(url)

  if (!request.cookies.get("_medusa_cache_id")) {
    response.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24,
    })
  }
  return response
}

export const config = {
  matcher: [
    "/((?!api|ucp|buy|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
