import { MedusaService } from "@medusajs/framework/utils"
import ProductSpecs from "./models/product-specs"

class ProductSpecsModuleService extends MedusaService({ ProductSpecs }) {}

export default ProductSpecsModuleService
