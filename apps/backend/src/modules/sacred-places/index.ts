import { Module } from "@medusajs/framework/utils"
import SacredPlacesModuleService from "./service"

export const SACRED_PLACES_MODULE = "sacred_places"

export default Module(SACRED_PLACES_MODULE, {
  service: SacredPlacesModuleService,
})
