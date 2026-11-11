import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import TestPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [TestPaymentProviderService],
})
