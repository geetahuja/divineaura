import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CourierFulfillmentService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, { services: [CourierFulfillmentService] })
