import type { ITaxProvider } from "@medusajs/framework/types"

/**
 * GST composition scheme (Admin → Business details → GST scheme = Composition).
 * A composition taxable person may not collect tax, so carts get NO tax lines:
 * prices are unchanged (they are the full price), invoices become a Bill of
 * Supply. Switching the setting points the India tax region at this provider
 * (lib/gst-scheme.ts) — no restart, works across server and worker processes.
 */
export default class CompositionTaxProvider implements ITaxProvider {
  static identifier = "gst-composition"
  getIdentifier() {
    return CompositionTaxProvider.identifier
  }
  async getTaxLines() {
    return []
  }
}
