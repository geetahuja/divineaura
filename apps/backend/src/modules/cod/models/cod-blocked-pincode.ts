import { model } from "@medusajs/framework/utils"

// PIN codes where COD is not offered (unique: a PIN can be listed once).
const CodBlockedPincode = model.define("cod_blocked_pincode", {
  id: model.id({ prefix: "codpin" }).primaryKey(),
  pincode: model.text().unique(),
})

export default CodBlockedPincode
