import type { ITaxProvider, ItemTaxCalculationLine, ItemTaxLineDTO, ShippingTaxCalculationLine, ShippingTaxLineDTO } from "@medusajs/framework/types"

/** product_type_id put on the COD fee line, so a fixed-rate override can target it. */
export const COD_FEE_TAX_TYPE = "cod_fee"

/**
 * Same as Medusa's built-in "system" tax provider, except for the Cash on
 * Delivery fee line (ARCHITECTURE.md §5.5, setting in Admin → COD & payments):
 *  - "Fixed rate": a tax override targets product type "cod_fee" → that rate is used.
 *  - "Same as the goods" (default, no override): the HIGHEST rate among the
 *    other items in the cart, so mixed-rate carts take the top rate.
 */
export default class GstTaxProvider implements ITaxProvider {
  static identifier = "gst"
  getIdentifier() {
    return GstTaxProvider.identifier
  }

  async getTaxLines(itemLines: ItemTaxCalculationLine[], shippingLines: ShippingTaxCalculationLine[]) {
    const isFee = (l: ItemTaxCalculationLine) => l.line_item.product_type_id === COD_FEE_TAX_TYPE
    const goodsRates = itemLines.filter((l) => !isFee(l)).flatMap((l) => l.rates)
    const highestGoods = goodsRates.reduce<(typeof goodsRates)[number] | null>((top, r) => (!top || (r.rate ?? 0) > (top.rate ?? 0) ? r : top), null)

    const line = (r: { id: string; rate?: number | null; name: string; code: string | null }, lineItemId: string): ItemTaxLineDTO =>
      ({ rate_id: r.id, rate: r.rate || 0, name: r.name, code: r.code, line_item_id: lineItemId, provider_id: this.getIdentifier() }) as ItemTaxLineDTO

    const items = itemLines.flatMap((l) => {
      if (!isFee(l)) return l.rates.map((r) => line(r, l.line_item.id))
      const fixed = l.rates.filter((r) => !r.is_default) // the "cod_fee" override, if set
      if (fixed.length) return fixed.map((r) => line(r, l.line_item.id))
      return highestGoods ? [line(highestGoods, l.line_item.id)] : l.rates.map((r) => line(r, l.line_item.id))
    })

    const shipping = shippingLines.flatMap((l) =>
      l.rates.map(
        (r) =>
          ({ rate_id: r.id, rate: r.rate || 0, name: r.name, code: r.code, shipping_line_id: l.shipping_line.id, provider_id: this.getIdentifier() }) as ShippingTaxLineDTO
      )
    )
    return [...items, ...shipping]
  }
}
