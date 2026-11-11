import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/framework/types"
import { merchandiseSubtotal, shippingPrice } from "../../lib/shipping"

type Options = { default_rate?: number; default_free_threshold?: number }

/**
 * DivineAura delivery (ARCHITECTURE.md §5.4): flat fee below the free-shipping
 * threshold, free at or above it. The threshold is checked against the product
 * subtotal after coupons, EXCLUDING the COD fee and the prepaid discount
 * (computed in the setCalculatedShippingPricingContext hook), so COD vs online
 * never changes shipping. Shipments themselves are created by our courier layer
 * (src/lib/shipments.ts); createFulfillment just records the result.
 */
class CourierFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "courier"
  private options: Options

  constructor(_cradle: Record<string, unknown>, options: Options = {}) {
    super()
    this.options = options
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "standard", name: "Standard delivery" }]
  }
  async validateOption() {
    return true
  }
  async validateFulfillmentData(_optionData: Record<string, unknown>, data: Record<string, unknown>) {
    return data
  }
  async canCalculate() {
    return true
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const c = context as Record<string, unknown> & { items?: Parameters<typeof merchandiseSubtotal>[0] }
    // From the hook; fallback (no coupons visible) only if the hook didn't run.
    const subtotal = typeof c.merchandise_subtotal === "number" ? c.merchandise_subtotal : merchandiseSubtotal(c.items ?? [])
    const rate = typeof c.shipping_rate === "number" ? c.shipping_rate : this.options.default_rate ?? 49
    const threshold =
      typeof c.free_shipping_threshold === "number" ? c.free_shipping_threshold : this.options.default_free_threshold ?? null
    return { calculated_amount: shippingPrice(subtotal, { rate, freeThreshold: threshold }), is_calculated_price_tax_inclusive: true }
  }

  async createFulfillment(data: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    const awb = data.awb as string | undefined
    return {
      data,
      labels: awb
        ? [{ tracking_number: awb, tracking_url: (data.tracking_url as string) ?? "", label_url: (data.label_url as string) ?? "" }]
        : [],
    }
  }
  async cancelFulfillment() {
    return {}
  }
  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default CourierFulfillmentService
