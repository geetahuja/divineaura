import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductVariant, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/sdk"

// MRP (compare-at price) lives in variant metadata.mrp, in whole rupees. It is
// display-only: the storefront shows it struck through; customers are always
// charged the variant's normal (selling) price.
const VariantMrpWidget = ({ data: variant }: DetailWidgetProps<AdminProductVariant>) => {
  const queryClient = useQueryClient()
  const current = variant.metadata?.mrp
  const [value, setValue] = useState(current === undefined || current === null ? "" : String(current))
  const inr = variant.prices?.find((p) => p.currency_code === "inr")?.amount

  const save = useMutation({
    mutationFn: (mrp: number | null) =>
      sdk.admin.product.updateVariant(variant.product_id!, variant.id, {
        metadata: { ...(variant.metadata ?? {}), mrp },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success("MRP saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSave = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      return save.mutate(null)
    }
    const mrp = Number(trimmed)
    if (!Number.isFinite(mrp) || mrp <= 0) {
      return toast.error("Enter MRP in rupees, e.g. 899")
    }
    if (inr !== undefined && mrp < inr) {
      return toast.error(`MRP can't be lower than the selling price (₹${inr})`)
    }
    save.mutate(mrp)
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">MRP</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Maximum retail price, shown struck through next to the selling price
          {inr !== undefined ? ` (₹${inr})` : ""}. Leave empty for no MRP.
        </Text>
      </div>
      <div className="flex items-end gap-x-2 px-6 py-4">
        <div className="flex flex-1 flex-col gap-y-1">
          <Label size="small" htmlFor="variant-mrp">MRP (₹, incl. GST)</Label>
          <Input
            id="variant-mrp"
            type="number"
            min={0}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button size="small" variant="secondary" isLoading={save.isPending} onClick={onSave}>
          Save
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_variant.details",
})

export default VariantMrpWidget
