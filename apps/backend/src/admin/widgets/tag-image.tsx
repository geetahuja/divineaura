import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductTag, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk, uploadFile } from "../lib/sdk"

// Tile image for deity:/intention: tags on the storefront homepage. Stored in
// tag metadata.image_url; without one the storefront shows the letter / icon.
const TagImageWidget = ({ data: tag }: DetailWidgetProps<AdminProductTag>) => {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const imageUrl = (tag.metadata?.image_url as string | undefined) ?? null

  const save = useMutation({
    mutationFn: (image_url: string | null) =>
      sdk.admin.productTag.update(tag.id, { metadata: { ...(tag.metadata ?? {}), image_url } }),
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success("Tile image saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!/^(deity|intention):/.test(tag.value)) {
    return null
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      save.mutate(await uploadFile(file))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Storefront tile image</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Shown on the homepage "Shop by {tag.value.startsWith("deity:") ? "Deity" : "Intention"}" tile.
          Square images work best (at least 400 × 400 px). Use only photos you own or have rights to.
        </Text>
      </div>
      <div className="flex items-center gap-4 px-6 py-4">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-20 w-20 rounded-full border object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border text-ui-fg-muted">
            None
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Input type="file" accept="image/*" disabled={uploading || save.isPending} onChange={(e) => onFile(e.target.files?.[0])} />
          {imageUrl && (
            <Button size="small" variant="secondary" isLoading={save.isPending} onClick={() => save.mutate(null)}>
              Remove image
            </Button>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_tag.details.after",
})

export default TagImageWidget
