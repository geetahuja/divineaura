import { MedusaService } from "@medusajs/framework/utils"
import SacredPlace from "./models/sacred-place"

class SacredPlacesModuleService extends MedusaService({ SacredPlace }) {}

export default SacredPlacesModuleService
