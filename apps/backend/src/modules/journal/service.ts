import { MedusaService } from "@medusajs/framework/utils"
import Article from "./models/article"

class JournalModuleService extends MedusaService({ Article }) {}

export default JournalModuleService
