import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"
import ReviewRequest from "./models/review-request"
import ReviewSettings from "./models/review-settings"

class ReviewsModuleService extends MedusaService({ Review, ReviewSettings, ReviewRequest }) {
  async getSettings() {
    const [s] = await this.listReviewSettings({}, { take: 1 })
    return s ?? (await this.createReviewSettings({}))
  }
}

export default ReviewsModuleService
