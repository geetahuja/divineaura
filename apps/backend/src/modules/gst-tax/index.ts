import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import GstTaxProvider from "./service"

export default ModuleProvider(Modules.TAX, { services: [GstTaxProvider] })
