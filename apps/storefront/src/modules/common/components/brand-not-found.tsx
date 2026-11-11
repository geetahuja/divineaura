import Link from "next/link"

export const notFoundMetadata = {
  title: "Page not found",
  description: "The page you were looking for could not be found.",
}

export default function BrandNotFound() {
  return (
    <div className="content-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <svg viewBox="0 0 64 40" aria-hidden className="h-14 w-20 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M32 6c-5 7-5 18 0 28 5-10 5-21 0-28Z" />
        <path d="M32 34c-8-3-15-10-17-21 9 1 15 7 17 21Z" />
        <path d="M32 34c8-3 15-10 17-21-9 1-15 7-17 21Z" />
      </svg>
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">404</p>
      <h1 className="font-serif text-4xl font-semibold text-primary">Page not found</h1>
      <p className="max-w-sm text-ink-soft">
        The page you are looking for may have moved or no longer exists.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
          Shop all products
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary">
          Go to homepage
        </Link>
      </div>
    </div>
  )
}
