// SKU format DA-<TYPE>-<DEITY>-<NNN>, e.g. DA-LKT-HAN-001.
// TYPE: product type metadata.sku_code, else first 3 letters of the type name.
// DEITY: first 3 letters of the first "deity:<Name>" tag. GEN when missing.

const code3 = (s?: string | null) => {
  const letters = (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  return letters ? letters.slice(0, 3).padEnd(3, "X") : "GEN"
}

export const skuPrefix = (product: {
  type?: { value?: string | null; metadata?: Record<string, unknown> | null } | null
  tags?: ({ value?: string | null } | null)[] | null
}) => {
  const typeCode =
    typeof product.type?.metadata?.sku_code === "string"
      ? code3(product.type.metadata.sku_code)
      : code3(product.type?.value)
  const deity = product.tags
    ?.map((t) => t?.value ?? "")
    .find((v) => v.toLowerCase().startsWith("deity:"))
  return `DA-${typeCode}-${code3(deity?.slice("deity:".length))}`
}

// Next free number after the highest existing SKU with this prefix.
export const nextSku = (prefix: string, existing: string[]) => {
  const max = existing.reduce((m, sku) => {
    const n = Number(sku.slice(prefix.length + 1))
    return sku.startsWith(`${prefix}-`) && Number.isInteger(n) ? Math.max(m, n) : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, "0")}`
}
