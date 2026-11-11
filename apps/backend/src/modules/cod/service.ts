import { MedusaService } from "@medusajs/framework/utils"
import CodBlockedPincode from "./models/cod-blocked-pincode"
import CodConfirmation from "./models/cod-confirmation"
import PaymentSettings from "./models/payment-settings"

export const SETTINGS_ID = "default"

class CodModuleService extends MedusaService({ PaymentSettings, CodBlockedPincode, CodConfirmation }) {
  // Creates the defaults row on first use (COD on, ₹49 fee, ₹3,000 max, 5% prepaid, 24 h).
  async getSettings() {
    const [row] = await this.listPaymentSettings({ id: SETTINGS_ID })
    return row ?? (await this.createPaymentSettings({ id: SETTINGS_ID }))
  }

  async isPincodeBlocked(pincode: string) {
    return (await this.listCodBlockedPincodes({ pincode: pincode.trim() }, { take: 1 })).length > 0
  }
}

export default CodModuleService
