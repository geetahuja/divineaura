import { MedusaService } from "@medusajs/framework/utils"
import Page from "./models/page"
import PrivacyRequest from "./models/privacy-request"

class ContentModuleService extends MedusaService({ Page, PrivacyRequest }) {}

export default ContentModuleService
