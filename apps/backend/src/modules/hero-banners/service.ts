import { MedusaService } from "@medusajs/framework/utils"
import HeroBanner from "./models/hero-banner"

class HeroBannersModuleService extends MedusaService({ HeroBanner }) {}

export default HeroBannersModuleService
