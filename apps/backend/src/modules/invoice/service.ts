import { MedusaService } from "@medusajs/framework/utils"
import BusinessSettings from "./models/business-settings"
import CreditNote from "./models/credit-note"
import DocCounter from "./models/doc-counter"
import Invoice from "./models/invoice"

class InvoiceModuleService extends MedusaService({ BusinessSettings, DocCounter, Invoice, CreditNote }) {
  async getSettings() {
    const [s] = await this.listBusinessSettings({}, { take: 1 })
    return s ?? (await this.createBusinessSettings({}))
  }

  /** Next consecutive number for a kind + FY. Call inside the "doc-counter" lock. */
  async nextSequence(kind: "invoice" | "credit_note" | "bill_of_supply", fy: string) {
    const [c] = await this.listDocCounters({ kind, fy })
    if (!c) {
      await this.createDocCounters({ kind, fy, last: 1 })
      return 1
    }
    await this.updateDocCounters({ id: c.id, last: c.last + 1 })
    return c.last + 1
  }
}

export default InvoiceModuleService
