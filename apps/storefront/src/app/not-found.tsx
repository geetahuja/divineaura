import BrandNotFound, { notFoundMetadata } from "@modules/common/components/brand-not-found"

export const metadata = notFoundMetadata

// Root fallback (no header/footer): keep the brand background.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory">
      <BrandNotFound />
    </div>
  )
}
