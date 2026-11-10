import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductSpecsModule from "../modules/product-specs"

// One specs row per product; deleted together with the product.
export default defineLink(ProductModule.linkable.product, {
  linkable: ProductSpecsModule.linkable.productSpecs,
  deleteCascade: true,
})
