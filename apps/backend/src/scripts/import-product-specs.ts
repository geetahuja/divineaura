import { readFileSync } from "node:fs"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { parse } from "csv-parse/sync"
import { csvRowToSpecs } from "../lib/specs-csv"
import { upsertProductSpecsWorkflow } from "../workflows/upsert-product-specs"

/**
 * Import product specs from a CSV (one row per product, matched by handle).
 * Products themselves are imported via Medusa Admin → Products → Import.
 *
 *   pnpm medusa exec ./src/scripts/import-product-specs.ts <file.csv>
 *
 * Columns: handle + any field of the product-specs module (see
 * product-specs.example.csv). A blank cell clears that field. Invalid rows are
 * skipped and reported; valid rows are still imported.
 */
export default async function importProductSpecs({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const file = args?.[0]
  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Usage: medusa exec ./src/scripts/import-product-specs.ts <file.csv>")
  }

  const rows: Record<string, string>[] = parse(readFileSync(file), {
    columns: true,
    bom: true, // Excel saves CSV with a BOM
    skip_empty_lines: true,
    trim: true,
  })

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: rows.map((r) => (r.handle ?? "").trim()).filter(Boolean) },
  })
  const idByHandle = new Map(products.map((p) => [p.handle, p.id]))

  let imported = 0
  const failures: string[] = []
  for (const [i, row] of rows.entries()) {
    const line = i + 2 // header is line 1
    const result = csvRowToSpecs(row)
    if (!result.ok) {
      failures.push(`line ${line} (${result.handle || "no handle"}): ${result.error}`)
      continue
    }
    const product_id = idByHandle.get(result.handle)
    if (!product_id) {
      failures.push(`line ${line} (${result.handle}): no product with this handle`)
      continue
    }
    await upsertProductSpecsWorkflow(container).run({ input: { product_id, data: result.specs } })
    imported++
  }

  logger.info(`Product specs: ${imported} imported, ${failures.length} skipped`)
  failures.forEach((f) => logger.warn(f))
}
