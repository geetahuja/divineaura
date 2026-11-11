import { MedusaService } from "@medusajs/framework/utils"
import OtpChallenge from "./models/otp-challenge"

class OtpModuleService extends MedusaService({ OtpChallenge }) {}

export default OtpModuleService
