import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { mergeWishlist } from "../../../../../lib/wishlist"
import type { WishlistBody } from "../../../../validators"

// Account wishlist: product ids in customer.metadata.wishlist (newest first, max 100).
async function load(req: AuthenticatedMedusaRequest) {
  const c = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(req.auth_context.actor_id)
  return { customer: c, ids: Array.isArray(c.metadata?.wishlist) ? (c.metadata!.wishlist as string[]) : [] }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ product_ids: (await load(req)).ids })
}

export async function POST(req: AuthenticatedMedusaRequest<WishlistBody>, res: MedusaResponse) {
  const { customer, ids } = await load(req)
  const { action, product_ids } = req.validatedBody
  const next =
    action === "remove" ? ids.filter((id) => !product_ids.includes(id)) : action === "add" ? mergeWishlist(ids, product_ids, true) : mergeWishlist(ids, product_ids)
  await req.scope.resolve(Modules.CUSTOMER).updateCustomers(customer.id, { metadata: { ...(customer.metadata ?? {}), wishlist: next } })
  res.json({ product_ids: next })
}
