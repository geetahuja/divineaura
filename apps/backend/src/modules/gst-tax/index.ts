import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CompositionTaxProvider from "./composition"
import GstTaxProvider from "./service"

// tp_gst_gst (regular GST) and tp_gst-composition_gst (composition scheme).
export default ModuleProvider(Modules.TAX, { services: [GstTaxProvider, CompositionTaxProvider] })
