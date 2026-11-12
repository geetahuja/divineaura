import { MedusaService } from "@medusajs/framework/utils"
import CourierSettings from "./models/courier-settings"
import ManualPincode from "./models/manual-pincode"
import OrderEvent from "./models/order-event"
import Shipment from "./models/shipment"

export const COURIER_SETTINGS_ID = "cset_default"

class ShippingModuleService extends MedusaService({ Shipment, OrderEvent, CourierSettings, ManualPincode }) {
  async getCourierSettings() {
    const [s] = await this.listCourierSettings({ id: COURIER_SETTINGS_ID })
    return s ?? (await this.createCourierSettings({ id: COURIER_SETTINGS_ID }))
  }

  async manualPincode(pincode: string) {
    const [p] = await this.listManualPincodes({ pincode })
    return p ?? null
  }

  /** Replaces the whole manual PIN list (bulk paste). cod = subset allowed for Cash on Delivery. */
  async replaceManualPincodes(serviceable: string[], cod: Set<string>) {
    const existing = await this.listManualPincodes({}, { select: ["id"], take: null })
    if (existing.length) await this.deleteManualPincodes(existing.map((p) => p.id))
    for (let i = 0; i < serviceable.length; i += 500) {
      await this.createManualPincodes(serviceable.slice(i, i + 500).map((pincode) => ({ pincode, cod: cod.has(pincode) })))
    }
    return serviceable.length
  }
}

export default ShippingModuleService
