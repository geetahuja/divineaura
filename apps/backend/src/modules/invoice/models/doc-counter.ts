import { model } from "@medusajs/framework/utils"

// Last number issued per document kind and financial year — never goes back.
const DocCounter = model
  .define("doc_counter", {
    id: model.id({ prefix: "dctr" }).primaryKey(),
    kind: model.enum(["invoice", "credit_note"]),
    fy: model.text(),
    last: model.number().default(0),
  })
  .indexes([{ on: ["kind", "fy"], unique: true }])

export default DocCounter
