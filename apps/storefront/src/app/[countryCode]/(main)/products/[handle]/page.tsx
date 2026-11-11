import { getProduct } from "@lib/data/product"
import { isVariantInStock } from "@lib/util/inventory"
import { buildProductStructuredData, getPricedVariants, toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import ProductTemplate from "@modules/product/template"
import { getProductReviews } from "@lib/data/reviews"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = { params: Promise<{ countryCode: string; handle: string }> }

export const dynamic = "force-static"
export const revalidate = 60

async function load(props: Props) {
  const { handle } = await props.params
  const { product, region } = await getProduct(handle)
  if (!product || !region) {
    notFound()
  }
  return { product, region }
}

// First ~155 characters of the description, cut at a word boundary.
const summary = (text: string) =>
  text.length <= 155 ? text : `${text.slice(0, 155).replace(/\s+\S*$/, "")}…`

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { product } = await load(props)
  const url = `${await getSiteOrigin()}/products/${product.handle}`
  const title = `${product.title} | ${STORE_NAME}`
  const description = summary(
    product.description || `${product.title} from ${STORE_NAME}. Prices inclusive of all taxes, delivered across India.`
  )
  const image = product.thumbnail || product.images?.[0]?.url

  return {
    title,
    description,
    alternates: { canonical: url, types: { "text/markdown": `${url}.md` } },
    // No product photo yet → leave images out so the site-wide default OG image applies.
    openGraph: { title, description, url, siteName: STORE_NAME, ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  }
}

export default async function ProductPage(props: Props) {
  const { product, region } = await load(props)
  const { countryCode } = await props.params
  const origin = await getSiteOrigin()
  const variants = getPricedVariants(product)
  const cheapest = variants.reduce<(typeof variants)[number] | undefined>(
    (min, v) => (!min || v.calculated_price!.calculated_amount! < min.calculated_price!.calculated_amount! ? v : min),
    undefined
  )
  const amount = cheapest?.calculated_price?.calculated_amount?.toFixed(2)
  // Approved reviews only (backend rule) — used for the reviews section and JSON-LD.
  const reviews = await getProductReviews(product.id, "newest", 0, 5)

  return (
    <>
      <meta property="og:type" content="product" />
      {amount && (
        <>
          <meta property="product:price:amount" content={amount} />
          <meta property="product:price:currency" content="INR" />
        </>
      )}
      <meta property="product:availability" content={variants.some(isVariantInStock) ? "in stock" : "out of stock"} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildProductStructuredData({ product, region, countryCode, productUrl: `${origin}/products/${product.handle}`, reviews })
          ),
        }}
      />
      <ProductTemplate product={product} reviews={reviews} />
    </>
  )
}
