import { model } from "@medusajs/framework/utils"

// PIN codes the manual courier (own courier tie-up) delivers to; cod = cash collected there.
const ManualPincode = model.define("manual_pincode", {
  id: model.id({ prefix: "mpin" }).primaryKey(),
  pincode: model.text().unique(),
  cod: model.boolean().default(false),
})

export default ManualPincode
