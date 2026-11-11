import { MedusaService } from "@medusajs/framework/utils"
import OrderEvent from "./models/order-event"
import Shipment from "./models/shipment"

class ShippingModuleService extends MedusaService({ Shipment, OrderEvent }) {}

export default ShippingModuleService
