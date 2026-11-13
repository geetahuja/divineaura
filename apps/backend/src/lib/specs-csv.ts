import { ProductSpecsBody, ProductSpecsSchema } from "../api/validators"

// CSV cells are strings; coerce them to the types ProductSpecsSchema expects,
// then validate with the same schema the admin widget uses. Blank = null.
const NUMBER_FIELDS = ["bead_size_mm", "length_cm", "weight_g", "bead_count", "pack_quantity"]

export type SpecsRowResult =
  | { ok: true; handle: string; specs: ProductSpecsBody }
  | { ok: false; handle: string; error: string }

export function csvRowToSpecs(row: Record<string, string>): SpecsRowResult {
  const { handle = "", ...cells } = row
  if (!handle.trim()) {
    return { ok: false, handle, error: "handle is empty" }
  }

  const input: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(cells)) {
    const v = (raw ?? "").trim()
    if (v === "") {
      input[key] = null
    } else if (NUMBER_FIELDS.includes(key)) {
      input[key] = Number(v) // NaN fails validation with a clear message
    } else if (key === "chain_included" || key === "not_returnable" || key === "liquid_fragile") {
      input[key] = /^(yes|true|1|y)$/i.test(v) ? true : /^(no|false|0|n)$/i.test(v) ? false : v
    } else {
      input[key] = v
    }
  }

  const parsed = ProductSpecsSchema.strict().safeParse(input) // strict: catch misspelt columns
  if (!parsed.success) {
    const error = parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ")
    return { ok: false, handle: handle.trim(), error }
  }
  return { ok: true, handle: handle.trim(), specs: parsed.data }
}
